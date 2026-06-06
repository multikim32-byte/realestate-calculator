/**
 * 공동주택 관리비 보강 스크립트
 *
 * 공동주택관리정보시스템(K-apt) 관리비 API →
 * 최근 3개월 평균 관리비 집계 → manage_cost JSONB 업데이트
 *
 * 사전 조건:
 *   1. data.go.kr "공동주택관리정보시스템 관리비 정보 서비스" 활용신청 후 승인
 *   2. Supabase에서 컬럼 추가:
 *      ALTER TABLE apartment_complexes
 *        ADD COLUMN IF NOT EXISTS manage_cost JSONB;
 *
 * 실행: node scripts/enrich-manage-cost.mjs
 * 옵션: --force  (이미 보강된 단지도 재수집)
 *       --months=N (기본: 3개월)
 * 필수 env: PUBLIC_DATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY = process.env.PUBLIC_DATA_API_KEY?.trim();
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음: PUBLIC_DATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase  = createClient(SB_URL, SB_KEY);
const BASE_URL  = 'https://apis.data.go.kr/1613000/AptMgFeeV2/getAptMgFeeListV2';
const force     = process.argv.includes('--force');
const monthsArg = process.argv.find(a => a.startsWith('--months='));
const MONTHS    = monthsArg ? parseInt(monthsArg.replace('--months=', '')) : 3;

// ── 최근 N개월 {year, month} 목록 ──────────────────────────────────────────────
function recentYMs(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1); // 전월부터 (당월 미집계)
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// ── 관리비 API 호출 ────────────────────────────────────────────────────────────
async function fetchMgFee(kaptCode, year, month) {
  try {
    const url = `${BASE_URL}?serviceKey=${encodeURIComponent(API_KEY)}&kaptCode=${kaptCode}&searchYear=${year}&searchMonth=${month}&numOfRows=100&_type=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    const resultCode = json?.response?.header?.resultCode;
    if (resultCode !== '00' && resultCode !== '0000') return null;
    const items = json?.response?.body?.items?.item;
    if (!items) return null;
    return Array.isArray(items) ? items : [items];
  } catch { return null; }
}

// ── 항목별 관리비 파싱 ─────────────────────────────────────────────────────────
// K-apt API 응답 필드:
//   mgFeeNm: 항목명 (일반관리비, 청소비, 경비비, 소독비, 승강기유지비, 난방비, 급탕비, 수선유지비, 장기수선충당금 등)
//   indvMgFeeAmt: 개별 세대 관리비 (원)
//   cmplxMgFeeAmt: 단지 전체 합계 (원)
//   indvAr: 세대 전용면적 (㎡) — 대표 면적 1개
function parseItems(items) {
  if (!items?.length) return null;

  const breakdown = {};
  let totalFee  = 0;
  let indvAr    = 0;

  for (const item of items) {
    const name = (item.mgFeeNm ?? '').trim();
    const amt  = parseInt(item.indvMgFeeAmt ?? item.cmplxMgFeeAmt ?? '0') || 0;
    if (!name || amt <= 0) continue;
    breakdown[name] = (breakdown[name] ?? 0) + amt;
    totalFee += amt;
    if (!indvAr && item.indvAr) indvAr = parseFloat(item.indvAr) || 0;
  }

  if (totalFee === 0) return null;

  return {
    total_fee:    totalFee,
    fee_per_m2:   indvAr > 0 ? Math.round(totalFee / indvAr) : null,
    breakdown,
    area:         indvAr || null,
  };
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏠 공동주택 관리비 보강 시작');
  console.log(`   기간: 최근 ${MONTHS}개월 평균 | ${force ? '전체 재수집' : '미보강만'}\n`);

  // 대상 단지 로드
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name')
    .not('kapt_code', 'is', null);
  if (!force) query = query.is('manage_cost', null);

  const complexes = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await query.order('kapt_code').range(from, from + 999);
    if (error) { console.error('조회 오류:', error.message); break; }
    if (!page?.length) break;
    complexes.push(...page);
    if (page.length < 1000) break;
    from += 1000;
  }

  console.log(`📍 보강 대상: ${complexes.length.toLocaleString()}개\n`);
  if (!complexes.length) { console.log('✅ 보강할 단지 없음'); return; }

  const yms = recentYMs(MONTHS);
  let done = 0, success = 0, skip = 0;

  for (const c of complexes) {
    // 최근 N개월 관리비 수집 후 평균
    const monthlyData = [];
    for (const { year, month } of yms) {
      const items = await fetchMgFee(c.kapt_code, year, month);
      const parsed = parseItems(items);
      if (parsed) monthlyData.push(parsed);
      await sleep(150);
    }

    if (monthlyData.length === 0) {
      // 관리비 없음 → 빈 객체 저장으로 재시도 방지
      await supabase
        .from('apartment_complexes')
        .update({ manage_cost: {}, updated_at: new Date().toISOString() })
        .eq('kapt_code', c.kapt_code);
      skip++;
    } else {
      // 월별 평균 계산
      const avgTotalFee = Math.round(monthlyData.reduce((s, d) => s + d.total_fee, 0) / monthlyData.length);
      const areas = monthlyData.filter(d => d.area).map(d => d.area);
      const area  = areas.length ? areas[0] : null;
      const avgPerM2 = area ? Math.round(avgTotalFee / area) : null;

      // 항목별 평균
      const allKeys = [...new Set(monthlyData.flatMap(d => Object.keys(d.breakdown)))];
      const avgBreakdown = {};
      for (const key of allKeys) {
        const vals = monthlyData.filter(d => d.breakdown[key]).map(d => d.breakdown[key]);
        if (vals.length) avgBreakdown[key] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      }

      const manage_cost = {
        avg_total_fee: avgTotalFee,
        avg_fee_per_m2: avgPerM2,
        area,
        months: monthlyData.length,
        breakdown: avgBreakdown,
        updated_ym: `${yms[0].year}${String(yms[0].month).padStart(2, '0')}`,
      };

      const { error } = await supabase
        .from('apartment_complexes')
        .update({ manage_cost, updated_at: new Date().toISOString() })
        .eq('kapt_code', c.kapt_code);
      if (error) console.error(`\n⚠️  ${c.name}:`, error.message);
      else success++;
    }

    done++;
    process.stdout.write(
      `\r  진행: ${done}/${complexes.length} | 성공: ${success} | 스킵: ${skip} | ${c.name}`.padEnd(80).slice(0, 80)
    );

    if (done % 50 === 0) await sleep(500);
  }

  console.log(`\n\n🎉 완료! 성공: ${success.toLocaleString()} | 스킵(관리비 없음): ${skip.toLocaleString()}`);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
