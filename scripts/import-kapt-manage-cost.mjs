/**
 * K-apt 단지 관리비정보 xlsx → manage_cost 업데이트
 *
 * 파일: 관리비/20260605_단지_관리비정보.xlsx
 * 최근 3개월(202601~202603) 평균 → 세대당 관리비 산출
 *
 * 실행: node scripts/import-kapt-manage-cost.mjs
 * 옵션: --force
 *       --file=경로
 *       --basis=경로  (기본정보 파일, 세대수 보완용)
 */

import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require   = createRequire(import.meta.url);
const XLSX      = require('xlsx');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('❌ Supabase 환경변수 없음'); process.exit(1); }

const supabase = createClient(SB_URL, SB_KEY);
const force    = process.argv.includes('--force');
const fileArg  = process.argv.find(a => a.startsWith('--file='));
const basisArg = process.argv.find(a => a.startsWith('--basis='));

const FEE_PATH   = fileArg  ? resolve(fileArg.replace('--file=', ''))
  : resolve(__dirname, '../관리비/20260605_단지_관리비정보.xlsx');
const BASIS_PATH = basisArg ? resolve(basisArg.replace('--basis=', ''))
  : resolve(__dirname, '../관리비/20260605_단지_기본정보.xlsx');

// ── 기본정보에서 세대수 맵 구성 ────────────────────────────────────────────────
console.log('📂 기본정보 로드 중...');
const bWb    = XLSX.readFile(BASIS_PATH);
const bRows  = XLSX.utils.sheet_to_json(bWb.Sheets[bWb.SheetNames[0]], { header: 1 });
const bHdr   = bRows[1];
const bCOL   = Object.fromEntries(bHdr.map((h, i) => [String(h ?? ''), i]));
const unitCountMap = new Map(); // kaptCode → 세대수

for (const row of bRows.slice(2)) {
  const code  = String(row[bCOL['단지코드']] ?? '').trim();
  const units = parseInt(row[bCOL['세대수']] ?? 0) || 0;
  if (code && units > 0) unitCountMap.set(code, units);
}
console.log(`   세대수 로드: ${unitCountMap.size.toLocaleString()}개 단지`);

// ── 관리비 파일 로드 ──────────────────────────────────────────────────────────
console.log('📂 관리비정보 로드 중...');
const wb   = XLSX.readFile(FEE_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
const HDR  = rows[1];
const COL  = Object.fromEntries(HDR.map((h, i) => [String(h ?? ''), i]));
const DATA = rows.slice(2);
console.log(`   행 수: ${DATA.length.toLocaleString()}`);

// 사용할 최근 3개월 선택 (가장 많은 단지 포함 월 기준)
const monthCount = new Map();
for (const row of DATA) {
  const ym = String(row[COL['발생년월(YYYYMM)']] ?? '').trim();
  if (ym) monthCount.set(ym, (monthCount.get(ym) ?? 0) + 1);
}
const TOP3_MONTHS = new Set(
  [...monthCount.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // 내림차순(최신순)
    .filter(([, c]) => c > 5000)            // 5,000단지 이상 포함 월만
    .slice(0, 3)
    .map(([m]) => m)
);
console.log(`   사용 월: ${[...TOP3_MONTHS].sort().join(', ')}`);

// ── 관리비 항목 정의 ──────────────────────────────────────────────────────────
const COMMON_FEES = ['인건비','청소비','경비비','소독비','승강기유지비','수선비','시설유지비','위탁관리수수료'];
const USAGE_FEES  = ['난방비(전용)','급탕비(전용)','가스사용료(전용)','전기료(전용)','수도료(전용)'];
const LONG_REPAIR = '장충금 월부과액';

// ── 단지별 월별 데이터 수집 ───────────────────────────────────────────────────
const complexFees = new Map(); // kaptCode → [{ym, 공용합계, 개별합계, 장충금, breakdown}]

for (const row of DATA) {
  const ym = String(row[COL['발생년월(YYYYMM)']] ?? '').trim();
  if (!TOP3_MONTHS.has(ym)) continue;

  const kaptCode  = String(row[COL['단지코드']] ?? '').trim();
  if (!kaptCode) continue;

  const 공용합계  = parseFloat(row[COL['공용관리비계']] ?? 0) || 0;
  const 개별합계  = parseFloat(row[COL['개별사용료계']] ?? 0) || 0;
  const 장충금    = parseFloat(row[COL[LONG_REPAIR]]    ?? 0) || 0;

  // 세부 breakdown
  const breakdown = {};
  for (const key of [...COMMON_FEES, ...USAGE_FEES]) {
    const val = parseFloat(row[COL[key]] ?? 0) || 0;
    if (val > 0) breakdown[key] = val;
  }

  if (!complexFees.has(kaptCode)) complexFees.set(kaptCode, []);
  complexFees.get(kaptCode).push({ ym, 공용합계, 개별합계, 장충금, breakdown });
}

console.log(`\n   관리비 보유 단지: ${complexFees.size.toLocaleString()}개`);

// ── DB 세대수 보완 (기본정보에 없는 경우 DB에서) ──────────────────────────────
console.log('🔍 DB 세대수 조회 중...');
const dbUnits = new Map();
let from = 0;
while (true) {
  const { data: page, error } = await supabase
    .from('apartment_complexes')
    .select('kapt_code, total_units')
    .not('total_units', 'is', null)
    .range(from, from + 999);
  if (error || !page?.length) break;
  page.forEach(r => dbUnits.set(r.kapt_code, r.total_units));
  if (page.length < 1000) break;
  from += 1000;
}

function getUnits(kaptCode) {
  return unitCountMap.get(kaptCode) ?? dbUnits.get(kaptCode) ?? 0;
}

// ── 집계 및 업데이트 ──────────────────────────────────────────────────────────
const now    = new Date().toISOString();
const refYM  = [...TOP3_MONTHS].sort().reverse()[0]; // 기준월 (최신)
let done = 0, success = 0, skip = 0, noUnits = 0;
const updates = [];

for (const [kaptCode, monthlyData] of complexFees) {
  const units = getUnits(kaptCode);
  if (units <= 0) { noUnits++; continue; }

  // 월평균 계산
  const n = monthlyData.length;
  const avg공용 = monthlyData.reduce((s, d) => s + d.공용합계, 0) / n;
  const avg개별 = monthlyData.reduce((s, d) => s + d.개별합계, 0) / n;
  const avg장충 = monthlyData.reduce((s, d) => s + d.장충금,  0) / n;
  const avgTotal = avg공용 + avg개별 + avg장충;

  // 세대당 환산
  const perUnit공용 = Math.round(avg공용 / units);
  const perUnit개별 = Math.round(avg개별 / units);
  const perUnit장충 = Math.round(avg장충 / units);
  const perUnitTotal = Math.round(avgTotal / units);

  // 세부 항목 세대당 평균
  const allKeys = [...new Set(monthlyData.flatMap(d => Object.keys(d.breakdown)))];
  const breakdownPerUnit = {};
  for (const key of allKeys) {
    const vals = monthlyData.filter(d => d.breakdown[key]).map(d => d.breakdown[key]);
    if (vals.length) {
      breakdownPerUnit[key] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length / units);
    }
  }

  const manage_cost = {
    per_unit_total:  perUnitTotal,
    per_unit_common: perUnit공용,
    per_unit_usage:  perUnit개별,
    per_unit_longterm: perUnit장충,
    total_units:     units,
    months:          n,
    ref_ym:          refYM,
    breakdown:       breakdownPerUnit,
  };

  updates.push({ kapt_code: kaptCode, manage_cost });
  done++;

  if (updates.length >= 200) {
    await flushUpdates(updates.splice(0, 200));
    success += 200;
    process.stdout.write(`\r  업데이트: ${success.toLocaleString()} / ${done.toLocaleString()}`);
  }
}

if (updates.length > 0) {
  await flushUpdates(updates);
  success += updates.length;
}

console.log(`\n\n🎉 완료!`);
console.log(`   업데이트: ${success.toLocaleString()}개`);
console.log(`   세대수 없음(스킵): ${noUnits.toLocaleString()}개`);

async function flushUpdates(batch) {
  await Promise.all(batch.map(({ kapt_code, manage_cost }) =>
    supabase.from('apartment_complexes')
      .update({ manage_cost, updated_at: now })
      .eq('kapt_code', kapt_code)
      .then(({ error }) => {
        if (error) console.error(`\n⚠️  ${kapt_code}:`, error.message);
      })
  ));
}
