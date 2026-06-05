/**
 * 단지 평형별 면적 보강 스크립트 v3
 *
 * MOLIT 실거래 API(RTMSDataSvcAptTradeDev) 최근 12개월 →
 * 단지별 전용면적 분포 집계 → unit_types (JSONB) 업데이트
 *
 * 실행: node scripts/enrich-unit-types.mjs
 * 옵션: --force (이미 보강된 단지도 재수집)
 *       --months=N (기본: 12개월)
 * 필수 env: MOLIT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAWD_CODE_MAP } from './lawd-codes.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const MOLIT_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!MOLIT_KEY || !SB_URL || !SB_KEY) { console.error('❌ 필수 환경변수 없음'); process.exit(1); }

const supabase = createClient(SB_URL, SB_KEY);
const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

const force = process.argv.includes('--force');
const monthsArg = process.argv.find(a => a.startsWith('--months='));
const MONTHS = monthsArg ? parseInt(monthsArg.replace('--months=', '')) : 12;

// ── 최근 N개월 YYYYMM 목록 ────────────────────────────────────────────────────
function recentYMs(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// ── XML 태그 추출 ─────────────────────────────────────────────────────────────
function getTag(xml, tag) {
  return xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';
}

// ── MOLIT 시군구×월 → {aptNm → Map<excl, count>} ──────────────────────────────
async function fetchAreas(lawdCode, ym) {
  const map = new Map();
  try {
    const url = `${TRADE_URL}?serviceKey=${encodeURIComponent(MOLIT_KEY)}&LAWD_CD=${lawdCode}&DEAL_YMD=${ym}&numOfRows=2000`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return map;
    const text = await res.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    for (const block of items) {
      if (getTag(block, 'cdealType').trim()) continue; // 해제 거래 스킵
      const aptNm = getTag(block, 'aptNm');
      const area  = parseFloat(getTag(block, 'excluUseAr')) || 0;
      if (!aptNm || area < 10) continue;
      if (!map.has(aptNm)) map.set(aptNm, new Map());
      const am = map.get(aptNm);
      am.set(area, (am.get(area) ?? 0) + 1);
    }
  } catch { /* ignore */ }
  return map;
}

// ── 이름 정규화 ───────────────────────────────────────────────────────────────
function normName(s) {
  return (s ?? '').replace(/아파트$/,'').replace(/\s+/g,'').toLowerCase();
}

// ── unit_types 배열 생성 ──────────────────────────────────────────────────────
function buildUnitTypes(areaMap) {
  if (!areaMap?.size) return null;
  return [...areaMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([excl, count]) => {
      const supply = Math.round(excl * 1.3 * 100) / 100;
      return {
        exclusive_area:   excl,
        supply_area:      supply,
        exclusive_pyeong: Math.round(excl / 3.3),
        supply_pyeong:    Math.round(supply / 3.3),
        count,
        source:           'trade',
      };
    });
}

// ── DB sigungu → lawd_cd 매칭 ─────────────────────────────────────────────────
// DB sigungu 예: "영통구", LAWD_CODE_MAP 예: "수원 영통구"
// 매칭 규칙: exact OR lawd name의 마지막 어절이 DB sigungu와 일치
function findLawdCode(sido, sigungu) {
  const list = LAWD_CODE_MAP[sido] ?? [];
  const exact = list.find(e => e.name === sigungu);
  if (exact) return exact.code;
  const suffix = list.find(e => e.name.endsWith(' ' + sigungu));
  if (suffix) return suffix.code;
  // DB sigungu가 더 길 경우 (예: "수원시 영통구" vs "수원 영통구")
  const normSig = sigungu.replace(/시$/, '').replace(/시 /, ' ');
  const partial = list.find(e => e.name === normSig || e.name.endsWith(' ' + normSig));
  return partial?.code ?? null;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  단지 평형 보강 시작 (실거래 기반)');
  console.log(`   모드: ${force ? '전체 재수집' : '미보강만'} | 기간: 최근 ${MONTHS}개월\n`);

  // 대상 단지 로드
  let query = supabase.from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu');
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

  console.log(`🏢 대상: ${complexes.length.toLocaleString()}개\n`);
  if (!complexes.length) { console.log('✅ 처리할 단지 없음'); return; }

  // lawd_cd별 단지 그루핑
  // lawdMap: lawd_cd → [{kapt_code, normName}]
  const lawdMap = new Map();
  let noLawd = 0;
  for (const c of complexes) {
    const code = findLawdCode(c.sido, c.sigungu);
    if (!code) { noLawd++; continue; }
    if (!lawdMap.has(code)) lawdMap.set(code, []);
    lawdMap.get(code).push({ kapt_code: c.kapt_code, name: c.name, norm: normName(c.name) });
  }
  if (noLawd > 0) console.log(`  ⚠️  lawd_cd 미매칭: ${noLawd}개 (스킵)\n`);

  const yms = recentYMs(MONTHS);
  let done = 0, matched = 0, skip = 0;
  const lawdTotal = lawdMap.size;
  let lawdDone = 0;

  for (const [lawd, complexList] of lawdMap) {
    // 12개월치 area 데이터 누적
    // merged: normAptNm → Map<excl, count>
    const merged = new Map();

    for (const ym of yms) {
      const m = await fetchAreas(lawd, ym);
      for (const [aptNm, areaMap] of m) {
        const norm = normName(aptNm);
        if (!merged.has(norm)) merged.set(norm, new Map());
        const target = merged.get(norm);
        for (const [area, cnt] of areaMap) {
          target.set(area, (target.get(area) ?? 0) + cnt);
        }
      }
      await sleep(100);
    }

    // DB 단지와 매칭 후 unit_types 생성
    const updates = [];
    for (const c of complexList) {
      // 1. 정확 매칭
      let areaMap = merged.get(c.norm);

      // 2. 부분 매칭 (포함 관계)
      if (!areaMap) {
        for (const [normKey, am] of merged) {
          if (normKey.includes(c.norm) || c.norm.includes(normKey)) {
            areaMap = am;
            break;
          }
        }
      }

      const unitTypes = buildUnitTypes(areaMap);
      if (unitTypes) {
        updates.push({ kapt_code: c.kapt_code, unit_types: unitTypes });
        matched++;
      } else {
        skip++;
      }
      done++;
    }

    // 배치 DB 업데이트 (50개씩 병렬)
    const now = new Date().toISOString();
    for (let i = 0; i < updates.length; i += 50) {
      await Promise.all(updates.slice(i, i + 50).map(u =>
        supabase.from('apartment_complexes')
          .update({ unit_types: u.unit_types, updated_at: now })
          .eq('kapt_code', u.kapt_code)
      ));
    }

    lawdDone++;
    process.stdout.write(
      `\r  시군구: ${lawdDone}/${lawdTotal} | 처리: ${done.toLocaleString()} | 성공: ${matched} | 스킵: ${skip}   `
    );

    await sleep(200);
  }

  console.log(`\n\n🎉 완료! 성공: ${matched.toLocaleString()} | 스킵: ${skip.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
