/**
 * 단지 주변환경 보강 스크립트
 *
 * Supabase apartment_complexes에서 좌표(lat/lng) 있는 단지를 읽어
 * 카카오 로컬 API로 교통/학군/인프라 정보 수집 후 JSONB 업데이트
 *
 * 실행: node scripts/enrich-complexes.mjs
 * 옵션: --only=transit|schools|infra (특정 카테고리만 실행)
 * 필수 env: KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KAKAO_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음: KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const KAKAO_LOCAL = 'https://dapi.kakao.com/v2/local/search/category.json';

// ── CLI 옵션 ──────────────────────────────────────────────────────────────────
const arg = process.argv.find(a => a.startsWith('--only='));
const only = arg ? arg.replace('--only=', '') : null;
const force = process.argv.includes('--force');
const addBus = process.argv.includes('--add-bus'); // 기존 subway 유지하면서 bus만 추가

// ── 카카오 카테고리 코드 ──────────────────────────────────────────────────────
const CATEGORIES = {
  // 교통
  transit: [
    { code: 'SW8', label: '지하철역', type: 'subway' },
  ],
  // 학교
  schools: [
    { code: 'SC4', label: '학교', type: 'school' },
  ],
  // 주변 인프라
  infra: [
    { code: 'MT1', label: '대형마트', type: 'mart' },
    { code: 'CS2', label: '편의점', type: 'convenience' },
    { code: 'HP8', label: '병원', type: 'hospital' },
    { code: 'BK9', label: '은행', type: 'bank' },
    { code: 'PK6', label: '주차장', type: 'parking' },
  ],
};

// ── 카카오 로컬 카테고리 검색 ─────────────────────────────────────────────────
async function searchNearby(lat, lng, categoryCode, radiusM = 1000) {
  try {
    const url = `${KAKAO_LOCAL}?category_group_code=${categoryCode}&x=${lng}&y=${lat}&radius=${radiusM}&size=5&sort=distance`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents ?? []).map(d => ({
      name:     d.place_name,
      distance: parseInt(d.distance ?? '0'),
      address:  d.road_address_name || d.address_name,
      phone:    d.phone || null,
    }));
  } catch {
    return [];
  }
}

// ── 카카오 키워드 검색 (버스정류장 등 카테고리 없는 POI용) ────────────────────
const KAKAO_KEYWORD = 'https://dapi.kakao.com/v2/local/search/keyword.json';
async function searchNearbyKeyword(lat, lng, query, radiusM = 500, size = 5) {
  try {
    const url = `${KAKAO_KEYWORD}?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=${radiusM}&size=${size}&sort=distance`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents ?? []).map(d => ({
      name:     d.place_name,
      distance: parseInt(d.distance ?? '0'),
      address:  d.road_address_name || d.address_name,
      phone:    d.phone || null,
    }));
  } catch {
    return [];
  }
}

// ── 학교 타입 분류 (초/중/고) ─────────────────────────────────────────────────
function classifySchool(name) {
  if (name.includes('초등') || name.endsWith('초')) return '초등';
  if (name.includes('중학') || name.endsWith('중')) return '중학';
  if (name.includes('고등') || name.endsWith('고')) return '고등';
  return '기타';
}

// ── --add-bus 전용: 기존 subway 유지 + bus만 추가 ──────────────────────────
async function enrichBusOnly(complex) {
  const buses = await searchNearbyKeyword(complex.lat, complex.lng, '버스정류장', 500, 5);
  await sleep(150);
  const busItems = buses.map(b => ({ ...b, category: 'bus' }));
  const existing = (complex.nearby_transit ?? []).filter(t => t.category !== 'bus');
  return {
    nearby_transit: [...existing, ...busItems].sort((a, b) => a.distance - b.distance),
  };
}

// ── 단지별 주변정보 수집 ─────────────────────────────────────────────────────
async function enrichOne(complex) {
  const { lat, lng } = complex;
  const result = {};

  // 교통 (지하철 1km)
  // 버스정류장: 카카오 카테고리 없음 → TAGO API 별도 연동 필요
  if (!only || only === 'transit') {
    const subways = await searchNearby(lat, lng, 'SW8', 1000);
    result.nearby_transit = subways.map(s => ({ ...s, category: 'subway' }));
    await sleep(300);
  }

  // 학교 (1km)
  if (!only || only === 'schools') {
    const schools = await searchNearby(lat, lng, 'SC4', 1000);
    result.nearby_schools = schools
      .map(s => ({ ...s, school_type: classifySchool(s.name) }))
      .sort((a, b) => a.distance - b.distance);
    await sleep(300);
  }

  // 인프라 (대형마트/편의점/병원/은행 — 500m)
  if (!only || only === 'infra') {
    const infraItems = [];
    for (const cat of CATEGORIES.infra) {
      const items = await searchNearby(lat, lng, cat.code, 500);
      infraItems.push(...items.slice(0, 3).map(i => ({ ...i, category: cat.type, label: cat.label })));
      await sleep(300);
    }
    result.nearby_infra = infraItems.sort((a, b) => a.distance - b.distance);
  }

  return result;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  단지 주변환경 보강 시작');
  if (addBus) console.log('   모드: --add-bus (subway 유지 + bus 추가)');
  else if (only) console.log(`   대상: ${only}만 수집`);
  console.log('');

  // 좌표 있는 단지 조회
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu, lat, lng, nearby_transit')
    .not('lat', 'is', null);

  // Supabase 기본 1,000행 제한 → 페이지네이션으로 전체 로드
  const allRows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page, error: pageErr } = await query.order('kapt_code').range(from, from + PAGE - 1);
    if (pageErr) { console.error('조회 오류:', pageErr.message); break; }
    if (!page || page.length === 0) break;
    allRows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  const error = null;

  // 처리 대상 필터링
  const complexes = addBus
    ? allRows.filter(c => !(c.nearby_transit ?? []).some(t => t.category === 'bus'))
    : (!only && !force)
      ? allRows.filter(c => !c.nearby_transit || c.nearby_transit.length === 0)
      : allRows;
  if (error) { console.error('❌ 조회 오류:', error.message); process.exit(1); }

  console.log(`📍 보강 대상: ${complexes.length.toLocaleString()}개\n`);

  let done = 0;
  const CONCURRENCY = 5; // 카카오 API 5 QPS 한도 내

  for (let i = 0; i < complexes.length; i += CONCURRENCY) {
    const batch = complexes.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (complex) => {
      const enriched = addBus ? await enrichBusOnly(complex) : await enrichOne(complex);
      const { error: upErr } = await supabase
        .from('apartment_complexes')
        .update({ ...enriched, updated_at: new Date().toISOString() })
        .eq('kapt_code', complex.kapt_code);
      if (upErr) console.error(`\n⚠️  ${complex.name}:`, upErr.message);
    }));

    done += batch.length;
    process.stdout.write(
      `\r  진행: ${done.toLocaleString()} / ${complexes.length.toLocaleString()} | ${complexes[i].name}`
        .substring(0, 80)
    );

    await sleep(200); // 배치 간 간격
  }

  console.log('\n\n🎉 보강 완료!');
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
