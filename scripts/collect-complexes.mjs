/**
 * 전국 아파트 단지 수집 스크립트
 *
 * 1. 국토교통부 공동주택 단지 목록 API (AptListService3) → 전국 단지 수집
 * 2. 카카오 Geocoding API → lat/lng 추가
 * 3. Supabase apartment_complexes upsert
 *
 * 실행: node scripts/collect-complexes.mjs
 * 필수 env: PUBLIC_DATA_API_KEY, KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

// ── 환경변수 ──────────────────────────────────────────────────────────────────
const KAPT_KEY    = process.env.PUBLIC_DATA_API_KEY?.trim();
const KAKAO_KEY   = process.env.KAKAO_REST_API_KEY?.trim();
const SB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KAPT_KEY || !KAKAO_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음: PUBLIC_DATA_API_KEY, KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);

const KAPT_BASE  = 'https://apis.data.go.kr/1613000/AptListService3/getTotalAptList3';
const KAKAO_BASE = 'https://dapi.kakao.com/v2/local/search/keyword.json';

// ── 시도 약칭 매핑 ────────────────────────────────────────────────────────────
const SIDO_MAP = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
  '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
  '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원특별자치도': '강원', '강원도': '강원',
  '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남',
  '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주',
};

// ── slug 생성 ─────────────────────────────────────────────────────────────────
function makeSlug(sido, sigungu, name) {
  const sidoAbbr = SIDO_MAP[sido] ?? sido.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  // 슬러그: 시도-시군구-단지명 (공백→붙임표, 특수문자 제거)
  const normalize = (s) => (s ?? '').replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
  return `${normalize(sidoAbbr)}-${normalize(sigungu)}-${normalize(name)}`;
}

// ── 공동주택 목록 전체 조회 ───────────────────────────────────────────────────
async function fetchAllComplexes() {
  const PER_PAGE = 100;
  let page = 1;
  let total = null;
  const all = [];

  while (true) {
    const url = `${KAPT_BASE}?serviceKey=${encodeURIComponent(KAPT_KEY)}&pageNo=${page}&numOfRows=${PER_PAGE}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`AptListService3 오류: ${res.status}`);
    const json = await res.json();
    const body = json?.response?.body;
    if (!body) throw new Error('응답 구조 이상');

    if (total === null) {
      total = body.totalCount;
      const pages = Math.ceil(total / PER_PAGE);
      console.log(`📦 전체 단지 수: ${total.toLocaleString()}개 (${pages}페이지)`);
    }

    const items = body.items ?? [];
    all.push(...items);
    process.stdout.write(`\r  수집 중: ${all.length.toLocaleString()} / ${total.toLocaleString()}`);

    if (all.length >= total) break;
    page++;
    await sleep(120); // 분당 500req 이내 유지
  }

  console.log('\n✅ 목록 수집 완료');
  return all;
}

// ── 카카오 Geocoding ──────────────────────────────────────────────────────────
async function geocode(name, sido, sigungu, dong) {
  const query = `${sido} ${sigungu} ${dong ?? ''} ${name}`.trim();
  try {
    const res = await fetch(
      `${KAKAO_BASE}?query=${encodeURIComponent(query)}&size=1`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json?.documents?.[0];
    if (!doc) return null;
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch {
    return null;
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  전국 아파트 단지 수집 시작\n');

  // 1. 전체 목록 수집
  const raw = await fetchAllComplexes();

  // 2. 이미 수집된 단지 조회 (재실행 시 스킵)
  const { data: existing } = await supabase
    .from('apartment_complexes')
    .select('kapt_code')
    .not('lat', 'is', null);
  const done = new Set((existing ?? []).map(r => r.kapt_code));
  console.log(`\n🔍 기존 수집 완료: ${done.size.toLocaleString()}개 (스킵)`);

  const todo = raw.filter(r => !done.has(r.kaptCode));
  console.log(`📍 Geocoding 대상: ${todo.length.toLocaleString()}개\n`);

  // 3. Geocoding + Supabase upsert (배치)
  const BATCH = 50;
  let success = 0, fail = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const rows = [];

    for (const item of chunk) {
      const sido     = item.as1 ?? '';
      const sigungu  = item.as2 ?? '';
      const dong     = item.as3 ?? '';
      const name     = item.kaptName ?? '';
      const slug     = makeSlug(sido, sigungu, name);

      const coord = await geocode(name, sido, sigungu, dong);
      await sleep(50); // 카카오 QPS 제한 대비

      rows.push({
        kapt_code:   item.kaptCode,
        name,
        slug,
        sido:        SIDO_MAP[sido] ?? sido,
        sigungu,
        dong,
        lat:         coord?.lat ?? null,
        lng:         coord?.lng ?? null,
        collected_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      });

      if (coord) success++; else fail++;
    }

    // Supabase upsert
    const { error } = await supabase
      .from('apartment_complexes')
      .upsert(rows, { onConflict: 'kapt_code', ignoreDuplicates: false });

    if (error) console.error('\n⚠️  upsert 오류:', error.message);

    const total = i + chunk.length;
    process.stdout.write(
      `\r  진행: ${total.toLocaleString()}/${todo.length.toLocaleString()} | 좌표 성공: ${success} 실패: ${fail}`
    );

    await sleep(100);
  }

  console.log('\n\n🎉 수집 완료!');
  console.log(`   좌표 성공: ${success}개 / 실패: ${fail}개`);
  console.log(`   실패한 단지는 enrich-complexes.mjs에서 재시도 가능`);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
