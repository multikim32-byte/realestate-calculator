/**
 * 단지 평형별 공급/전용면적 보강 스크립트
 *
 * 청약홈 API → 주택형별 공급/전용면적 수집 →
 * apartment_complexes.unit_types (JSONB) 업데이트
 *
 * - 청약 데이터 있는 단지: 정확한 공급면적
 * - 없는 단지: 전용면적 × 1.3 추산
 *
 * 실행: node scripts/enrich-unit-types.mjs
 * 옵션: --force (이미 있는 단지도 재수집)
 *
 * Supabase 사전 실행:
 *   ALTER TABLE apartment_complexes ADD COLUMN IF NOT EXISTS unit_types JSONB;
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const force = process.argv.includes('--force');
const BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

// ── 청약 API 조회 ─────────────────────────────────────────────────────────────
async function fetchApi(endpoint, params = {}) {
  const qs = new URLSearchParams({ serviceKey: API_KEY, page: '1', perPage: '100', ...params });
  const url = `${BASE}/${endpoint}?${qs}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

async function fetchAllPages(endpoint, params = {}) {
  const results = [];
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ serviceKey: API_KEY, page: String(page), perPage: '100', ...params });
    const url = `${BASE}/${endpoint}?${qs}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const json = await res.json();
      const data = json.data ?? [];
      results.push(...data);
      if (results.length >= (json.totalCount ?? 0) || data.length < 100) break;
      page++;
      await sleep(200);
    } catch { break; }
  }
  return results;
}

// ── 주소에서 시도/시군구 추출 ──────────────────────────────────────────────────
function parseAddr(addr) {
  if (!addr) return { sido: '', sigungu: '' };
  const parts = addr.trim().split(/\s+/);
  return { sido: parts[0] ?? '', sigungu: parts[1] ?? '' };
}

// ── 단지명 정규화 (매칭용) ─────────────────────────────────────────────────────
function normName(s) {
  return s
    .replace(/[^\w가-힣]/g, '')
    .replace(/아파트|단지|지구|블록|공공분양|민간분양|임대|행복|더샵|자이|래미안|푸르지오|힐스테이트/g, '')
    .toLowerCase();
}

// ── HOUSE_TY에서 전용면적 추출: "079.0000A" → 79.0 ──────────────────────────
function parseExclusiveArea(houseType) {
  const m = houseType?.match(/^(\d+\.\d+)/);
  return m ? parseFloat(m[1]) : 0;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  단지 평형 공급면적 보강 시작');
  console.log(`   모드: ${force ? '전체 재수집' : '미보강만'}\n`);

  // 1. 청약 공고 전체 수집 (일반분양 아파트)
  console.log('📥 청약 공고 수집 중...');
  const allPblanc = await fetchAllPages('getAPTLttotPblancDetail', {
    'cond[HOUSE_SECD::IN]': '01,04', // 01:민간, 04:공공
  });
  console.log(`   공고 ${allPblanc.length}건 수집\n`);

  // 2. 공고별 주택형 데이터 수집
  console.log('📐 주택형 데이터 수집 중...');
  // PBLANC_NO → [{ HOUSE_TY, SUPLY_AR, SUPLY_HSHLDCO }]
  const pblancTypeMap = new Map();

  // 배치 조회 (50개씩)
  const BATCH = 50;
  for (let i = 0; i < allPblanc.length; i += BATCH) {
    const batch = allPblanc.slice(i, i + BATCH);
    const pblancNos = batch.map(p => p.PBLANC_NO).join(',');
    const types = await fetchAllPages('getAPTLttotPblancMdl', {
      'cond[PBLANC_NO::IN]': pblancNos,
    });
    for (const t of types) {
      if (!pblancTypeMap.has(t.PBLANC_NO)) pblancTypeMap.set(t.PBLANC_NO, []);
      pblancTypeMap.get(t.PBLANC_NO).push(t);
    }
    process.stdout.write(`\r   진행: ${Math.min(i + BATCH, allPblanc.length)} / ${allPblanc.length}`);
    await sleep(300);
  }
  console.log(`\n   주택형 데이터 ${pblancTypeMap.size}개 공고분 수집\n`);

  // 3. 공고 → 정규화된 (sido, sigungu, normName, unitTypes) 목록 구성
  const pblancList = allPblanc
    .filter(p => pblancTypeMap.has(p.PBLANC_NO))
    .map(p => {
      const addr = parseAddr(p.HSSPLY_ADRES);
      const types = pblancTypeMap.get(p.PBLANC_NO) ?? [];
      const unitTypes = types
        .filter(t => parseFloat(t.SUPLY_AR ?? '0') > 0)
        .map(t => {
          const supplyArea    = parseFloat(t.SUPLY_AR);
          const exclusiveArea = parseExclusiveArea(t.HOUSE_TY);
          return {
            house_ty:          t.HOUSE_TY,
            supply_area:       Math.round(supplyArea * 100) / 100,
            exclusive_area:    Math.round(exclusiveArea * 100) / 100,
            supply_pyeong:     Math.round(supplyArea / 3.3),
            exclusive_pyeong:  Math.round(exclusiveArea / 3.3),
            count:             parseInt(t.SUPLY_HSHLDCO ?? '0') || 0,
            source:            'cheongak',
          };
        });
      if (!unitTypes.length) return null;
      return {
        sido:      addr.sido,
        sigungu:   addr.sigungu,
        normHouse: normName(p.HOUSE_NM ?? ''),
        houseName: p.HOUSE_NM ?? '',
        unitTypes,
      };
    })
    .filter(Boolean);

  console.log(`📋 매칭 대상 청약 공고: ${pblancList.length}건`);

  // 4. DB 단지 로드
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu')
    .not('sido', 'is', null);
  if (!force) query = query.is('unit_types', null);

  const complexes = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.order('kapt_code').range(from, from + 999);
    if (error || !data?.length) break;
    complexes.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`🏢 보강 대상 단지: ${complexes.length.toLocaleString()}개\n`);

  // 5. 매칭 + 업데이트
  let matched = 0, estimated = 0, done = 0;

  // sido/sigungu 기준 청약 데이터 인덱스 구성
  const byRegion = new Map();
  for (const p of pblancList) {
    const key = `${p.sido}__${p.sigungu}`;
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key).push(p);
  }

  const updates = [];

  for (const c of complexes) {
    const key = `${c.sido}__${c.sigungu}`;
    const candidates = byRegion.get(key) ?? [];
    const normComplex = normName(c.name);

    // 단지명 유사도 매칭 (정규화 후 포함 관계)
    let best = null;
    let bestScore = 0;
    for (const p of candidates) {
      // 공통 문자 비율
      const a = normComplex, b = p.normHouse;
      const shorter = a.length < b.length ? a : b;
      const longer  = a.length < b.length ? b : a;
      if (shorter.length < 3) continue;
      const score = shorter.split('').filter(ch => longer.includes(ch)).length / shorter.length;
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        best = p;
      }
    }

    if (best) {
      updates.push({ kapt_code: c.kapt_code, unit_types: best.unitTypes });
      matched++;
    }
    // 매칭 안 된 단지는 청약 데이터 없음 → 나중에 추산으로 처리
    done++;
    if (done % 500 === 0) process.stdout.write(`\r  매칭: ${done.toLocaleString()}/${complexes.length.toLocaleString()} | 성공: ${matched}`);
  }

  console.log(`\n\n✅ 매칭 완료: ${matched}건`);

  // 6. 배치 업데이트
  console.log('💾 DB 저장 중...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(u =>
      supabase.from('apartment_complexes')
        .update({ unit_types: u.unit_types, updated_at: new Date().toISOString() })
        .eq('kapt_code', u.kapt_code)
        .then(({ error }) => { if (error) console.error('\n⚠️ ', error.message); })
    ));
    process.stdout.write(`\r  저장: ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`);
  }

  console.log(`\n\n🎉 완료! 청약 매칭: ${matched}건 | 나머지 ${complexes.length - matched}건은 추산값으로 표시`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
