/**
 * K-apt 단지 면적정보 xlsx → unit_types 업데이트
 *
 * 파일: 관리비/20260605_단지_면적정보.xlsx
 * 컬럼: 시도, 시군구, 읍면, 동리, 단지코드, 단지명, 동수,
 *       관리비부과면적, 주거전용면적(단지합계), 주거전용면적(세부), 세대수
 *
 * 실행: node scripts/import-kapt-area.mjs
 * 옵션: --force  (기존 unit_types 덮어쓰기)
 *       --file=경로  (기본: 관리비/20260605_단지_면적정보.xlsx)
 */

import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require  = createRequire(import.meta.url);
const XLSX     = require('xlsx');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('❌ Supabase 환경변수 없음'); process.exit(1); }

const supabase = createClient(SB_URL, SB_KEY);
const force    = process.argv.includes('--force');
const fileArg  = process.argv.find(a => a.startsWith('--file='));
const XLSX_PATH = fileArg
  ? resolve(fileArg.replace('--file=', ''))
  : resolve(__dirname, '../관리비/20260605_단지_면적정보.xlsx');

// ── xlsx 로드 ─────────────────────────────────────────────────────────────────
console.log('📂 파일 로드 중...');
const wb   = XLSX.readFile(XLSX_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

// 0번: 안내문, 1번: 헤더, 2번~: 데이터
const HDR  = rows[1]; // 헤더행
const COL  = Object.fromEntries(HDR.map((h, i) => [h, i]));
const DATA = rows.slice(2);

console.log(`   행 수: ${DATA.length.toLocaleString()}`);

// ── 단지별 그룹핑 ─────────────────────────────────────────────────────────────
const complexMap = new Map(); // kaptCode → { supplyTotal, exclTotal, types[] }

for (const row of DATA) {
  const kaptCode    = String(row[COL['단지코드']] ?? '').trim();
  const supplyTotal = parseFloat(row[COL['관리비부과면적']] ?? 0) || 0;
  const exclTotal   = parseFloat(row[COL['주거전용면적(단지합계)']] ?? 0) || 0;
  const exclUnit    = parseFloat(row[COL['주거전용면적(세부)']] ?? 0) || 0;
  const count       = parseInt(row[COL['세대수']] ?? 0) || 0;

  if (!kaptCode || exclUnit <= 0 || count <= 0) continue;

  if (!complexMap.has(kaptCode)) {
    complexMap.set(kaptCode, { supplyTotal, exclTotal, types: [] });
  }
  complexMap.get(kaptCode).types.push({ exclUnit, count });
}

console.log(`   단지 수: ${complexMap.size.toLocaleString()}`);

// ── unit_types 배열 생성 ──────────────────────────────────────────────────────
function buildUnitTypes(supplyTotal, exclTotal, types) {
  // 공급면적 = 전용면적 × (관리비부과면적합계 / 전용면적합계) — 단지별 실측 비율 사용
  const ratio = exclTotal > 0 ? supplyTotal / exclTotal : 1.3;

  return types
    .sort((a, b) => a.exclUnit - b.exclUnit)
    .map(({ exclUnit, count }) => {
      const supplyUnit = Math.round(exclUnit * ratio * 100) / 100;
      return {
        exclusive_area:   Math.round(exclUnit * 100) / 100,
        supply_area:      supplyUnit,
        exclusive_pyeong: Math.round(exclUnit / 3.3),
        supply_pyeong:    Math.round(supplyUnit / 3.3),
        count,
        source:           'kapt',
      };
    });
}

// ── DB 조회 (unit_types null or force) ────────────────────────────────────────
console.log('\n🔍 DB 조회 중...');
const dbComplexes = [];
let from = 0;
while (true) {
  let q = supabase.from('apartment_complexes').select('kapt_code');
  if (!force) q = q.is('unit_types', null);
  const { data: page, error } = await q.order('kapt_code').range(from, from + 999);
  if (error) { console.error('조회 오류:', error.message); break; }
  if (!page?.length) break;
  dbComplexes.push(...page.map(r => r.kapt_code));
  if (page.length < 1000) break;
  from += 1000;
}

const targets = new Set(dbComplexes);
console.log(`   보강 대상: ${targets.size.toLocaleString()}개`);

// ── 배치 업데이트 ─────────────────────────────────────────────────────────────
const now = new Date().toISOString();
let done = 0, success = 0, skip = 0;
const BATCH = 200;
const updates = [];

for (const [kaptCode, { supplyTotal, exclTotal, types }] of complexMap) {
  if (!force && !targets.has(kaptCode)) { skip++; continue; }

  const unitTypes = buildUnitTypes(supplyTotal, exclTotal, types);
  updates.push({ kapt_code: kaptCode, unit_types: unitTypes });
  done++;

  if (updates.length >= BATCH) {
    await flushUpdates(updates.splice(0, BATCH));
    success += BATCH;
    process.stdout.write(`\r  업데이트: ${success.toLocaleString()} / ${done.toLocaleString()}`);
  }
}

if (updates.length > 0) {
  await flushUpdates(updates);
  success += updates.length;
}

console.log(`\n\n🎉 완료! 업데이트: ${success.toLocaleString()} | 이미있음(스킵): ${skip.toLocaleString()}`);

async function flushUpdates(batch) {
  await Promise.all(batch.map(({ kapt_code, unit_types }) =>
    supabase.from('apartment_complexes')
      .update({ unit_types, updated_at: now })
      .eq('kapt_code', kapt_code)
      .then(({ error }) => {
        if (error) console.error(`\n⚠️  ${kapt_code}:`, error.message);
      })
  ));
}
