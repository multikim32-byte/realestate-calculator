/**
 * MOLIT First 전환 스크립트
 *
 * 1. A-prefix with molit_key (12,744개)  → source='molit'  (MOLIT primary로 공식 전환)
 * 2. A-prefix without molit_key (8,802개) → source='kapt_deprecated'  (지도/검색에서 숨김)
 * 3. M-prefix 활성 (16,611개)            → 변경 없음 (이미 MOLIT primary)
 *
 * 실행: node scripts/switch-to-molit-primary.mjs
 * 옵션: --dry-run  (DB 변경 없이 미리보기)
 *       --confirm  (실제 실행 - 이 플래그 없으면 dry-run으로 동작)
 */

import { createClient } from '@supabase/supabase-js';
import { config }       from 'dotenv';
import { resolve }      from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('❌ 환경변수 없음'); process.exit(1); }

const sb      = createClient(SB_URL, SB_KEY);
const DRY     = !process.argv.includes('--confirm');
const BATCH   = 500;

if (DRY) {
  console.log('🔍 DRY-RUN 모드 (실제 DB 변경 없음)\n   실제 실행: node scripts/switch-to-molit-primary.mjs --confirm\n');
}

async function paginate(query, fields) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.select(fields).order('kapt_code').range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function batchUpdate(rows, updateFn, label) {
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    if (!DRY) {
      for (const row of chunk) {
        const { error } = await updateFn(row);
        if (error) console.error(`  ⚠️  ${row.kapt_code}: ${error.message}`);
      }
    }
    done += chunk.length;
    process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
  }
  console.log();
}

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  MOLIT First 전환 스크립트');
  console.log('══════════════════════════════════════════════════════\n');

  // ── 1. 현황 조회 ──────────────────────────────────────────────────────────────
  console.log('📊 현재 상태 조회 중...');
  const [
    { count: aWithMolit },
    { count: aNoMolit },
    { count: mActive },
    { count: mDeprecated },
  ] = await Promise.all([
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).like('kapt_code','A%').not('molit_key','is',null).neq('source','kapt_deprecated'),
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).like('kapt_code','A%').is('molit_key',null).neq('source','kapt_deprecated'),
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).like('kapt_code','M%').neq('source','kapt_deprecated'),
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).like('kapt_code','M%').eq('source','kapt_deprecated'),
  ]);

  console.log(`
  현재 활성 단지:
  ├─ A-prefix (molit_key 있음): ${aWithMolit?.toLocaleString()}개  → source='molit' 전환
  ├─ A-prefix (molit_key 없음): ${aNoMolit?.toLocaleString()}개  → deprecated 처리
  ├─ M-prefix 활성:             ${mActive?.toLocaleString()}개  → 변경 없음
  └─ M-prefix deprecated:       ${mDeprecated?.toLocaleString()}개  → 변경 없음

  전환 후 활성 단지: ${((aWithMolit ?? 0) + (mActive ?? 0)).toLocaleString()}개
  `);

  // ── 2. A-prefix with molit_key 샘플 확인 ──────────────────────────────────────
  const { data: sample1 } = await sb.from('apartment_complexes')
    .select('kapt_code, name, molit_key, source, sido, sigungu')
    .like('kapt_code', 'A%')
    .not('molit_key', 'is', null)
    .neq('source', 'kapt_deprecated')
    .order('total_units', { ascending: false })
    .limit(5);

  console.log('  ▶ MOLIT 전환 예정 상위 5개 (세대수 순):');
  for (const r of sample1 ?? []) {
    console.log(`    ${r.kapt_code} | ${r.name.padEnd(25)} | ${r.molit_key}`);
  }

  // ── 3. A-prefix without molit_key 샘플 확인 ───────────────────────────────────
  const { data: sample2 } = await sb.from('apartment_complexes')
    .select('kapt_code, name, source, sido, sigungu, total_units')
    .like('kapt_code', 'A%')
    .is('molit_key', null)
    .neq('source', 'kapt_deprecated')
    .order('total_units', { ascending: false })
    .limit(5);

  console.log('\n  ▶ Deprecated 예정 상위 5개 (세대수 순):');
  for (const r of sample2 ?? []) {
    console.log(`    ${r.kapt_code} | ${r.name.padEnd(25)} | ${r.sido} ${r.sigungu} | ${r.total_units ?? '?'}세대`);
  }

  console.log('\n──────────────────────────────────────────────────────');

  if (DRY) {
    console.log('\n✅ DRY-RUN 완료. 실제 실행하려면:');
    console.log('   node scripts/switch-to-molit-primary.mjs --confirm\n');
    return;
  }

  // ── 4. 실제 전환 실행 ─────────────────────────────────────────────────────────
  console.log('\n🚀 전환 시작...\n');

  // 4-1. A-prefix with molit_key → source='molit'
  console.log('  [1/2] A-prefix (molit_key 있음) → source=\'molit\'');
  const aWithRows = [];
  { let from = 0;
    while (true) {
      const { data, error } = await sb.from('apartment_complexes')
        .select('kapt_code').like('kapt_code','A%').not('molit_key','is',null).neq('source','kapt_deprecated')
        .order('kapt_code').range(from, from + 999);
      if (error || !data?.length) break;
      aWithRows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`  대상: ${aWithRows.length.toLocaleString()}개`);

  for (let i = 0; i < aWithRows.length; i += BATCH) {
    const codes = aWithRows.slice(i, i + BATCH).map(r => r.kapt_code);
    const { error } = await sb.from('apartment_complexes').update({ source: 'molit' }).in('kapt_code', codes);
    if (error) console.error(`  ⚠️  배치 오류:`, error.message);
    process.stdout.write(`\r  진행: ${Math.min(i + BATCH, aWithRows.length)}/${aWithRows.length}`);
  }
  console.log(' ✓');

  // 4-2. A-prefix without molit_key → source='kapt_deprecated'
  console.log('\n  [2/2] A-prefix (molit_key 없음) → source=\'kapt_deprecated\'');
  const aNoRows = [];
  { let from = 0;
    while (true) {
      const { data, error } = await sb.from('apartment_complexes')
        .select('kapt_code').like('kapt_code','A%').is('molit_key',null).neq('source','kapt_deprecated')
        .order('kapt_code').range(from, from + 999);
      if (error || !data?.length) break;
      aNoRows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`  대상: ${aNoRows.length.toLocaleString()}개`);

  for (let i = 0; i < aNoRows.length; i += BATCH) {
    const codes = aNoRows.slice(i, i + BATCH).map(r => r.kapt_code);
    const { error } = await sb.from('apartment_complexes').update({ source: 'kapt_deprecated' }).in('kapt_code', codes);
    if (error) console.error(`  ⚠️  배치 오류:`, error.message);
    process.stdout.write(`\r  진행: ${Math.min(i + BATCH, aNoRows.length)}/${aNoRows.length}`);
  }
  console.log(' ✓');

  // ── 5. 결과 검증 ──────────────────────────────────────────────────────────────
  console.log('\n\n📊 전환 후 상태:');
  const [
    { count: newMolit },
    { count: newADeprecated },
    { count: newMActive },
  ] = await Promise.all([
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).eq('source','molit'),
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).eq('source','kapt_deprecated'),
    sb.from('apartment_complexes').select('*', {count:'exact',head:true}).like('kapt_code','M%').neq('source','kapt_deprecated'),
  ]);

  console.log(`
  ├─ source='molit' 전체:      ${newMolit?.toLocaleString()}개  ← 활성 단지
  ├─ source='kapt_deprecated': ${newADeprecated?.toLocaleString()}개
  └─ M-prefix 활성:            ${newMActive?.toLocaleString()}개

  🎉 MOLIT First 전환 완료!

  다음 단계:
  1. node scripts/enrich-prices.mjs --force
     (M-prefix 16,611개 avg_price 재계산)
  2. M-prefix에 K-apt 관리비·세대수 보강 (enrich-molit-from-kapt.mjs)
  `);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
