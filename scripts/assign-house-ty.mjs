/**
 * unit_types 클러스터링 → house_ty 자동 부여
 *
 * K-apt XLSX로 저장된 unit_types에는 house_ty가 없고
 * 동일 평형 내 미세차이 면적(±0.01~0.2㎡)이 여러 행으로 분산돼 있음.
 * 0.2㎡ 이내 연속 항목을 같은 클러스터로 병합 → house_ty 코드("18평A" 등) 부여.
 *
 * 실행: node scripts/assign-house-ty.mjs
 * 옵션:
 *   --kapt=CODE   특정 단지만 처리
 *   --dry-run     DB 업데이트 없이 결과만 출력
 *   --force       이미 house_ty 있어도 덮어쓰기
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) { console.error('❌ Supabase 환경변수 없음'); process.exit(1); }

const supabase = createClient(SB_URL, SB_KEY);
const dryRun   = process.argv.includes('--dry-run');
const force    = process.argv.includes('--force');
const kaptArg  = process.argv.find(a => a.startsWith('--kapt='))?.replace('--kapt=', '');

const CLUSTER_GAP = 0.25; // ㎡ — 이 이하 연속 차이면 같은 타입

// ── 클러스터링 핵심 함수 ───────────────────────────────────────────────────────
function clusterUnitTypes(unitTypes) {
  // 1) exclusive_pyeong → 그룹핑
  const byPyeong = new Map();
  for (const ut of unitTypes) {
    const py = ut.exclusive_pyeong;
    if (!byPyeong.has(py)) byPyeong.set(py, []);
    byPyeong.get(py).push(ut);
  }

  const result = [];

  for (const [py, group] of byPyeong) {
    // 전용면적 오름차순 정렬
    const sorted = [...group].sort((a, b) => a.exclusive_area - b.exclusive_area);

    // 2) 0.25㎡ 이내 연속 항목 → 같은 클러스터 (single-linkage)
    const clusters = [];
    let cur = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].exclusive_area - sorted[i - 1].exclusive_area <= CLUSTER_GAP) {
        cur.push(sorted[i]);
      } else {
        clusters.push(cur);
        cur = [sorted[i]];
      }
    }
    clusters.push(cur);

    // 3) 각 클러스터 → 대표 unit_type 생성
    for (let ci = 0; ci < clusters.length; ci++) {
      const cl = clusters[ci];
      const letter = clusters.length > 1 ? String.fromCharCode(65 + ci) : '';
      const code   = `${py}평${letter}`;

      // 세대수 최다 항목을 대표면적으로 사용, 세대수는 합산
      const dominant = cl.reduce((a, b) => a.count >= b.count ? a : b);
      const totalCount = cl.reduce((s, u) => s + u.count, 0);

      result.push({
        house_ty:         code,
        exclusive_area:   dominant.exclusive_area,
        supply_area:      dominant.supply_area,
        exclusive_pyeong: dominant.exclusive_pyeong,
        supply_pyeong:    dominant.supply_pyeong,
        count:            totalCount,
        source:           dominant.source ?? 'kapt',
      });
    }
  }

  return result.sort((a, b) => a.exclusive_area - b.exclusive_area);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🏗️  house_ty 자동 부여 시작 (CLUSTER_GAP=${CLUSTER_GAP}㎡)`);
  console.log(`   dry-run: ${dryRun} | force: ${force}\n`);

  // 대상 단지 조회
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, unit_types');

  if (kaptArg) {
    query = query.eq('kapt_code', kaptArg);
  } else if (!force) {
    // house_ty가 null인 unit_type 항목이 하나라도 있는 단지
    query = query.not('unit_types', 'is', null);
  }

  const complexes = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) { console.error('조회 오류:', error.message); break; }
    if (!data?.length) break;
    complexes.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // force가 아니면 house_ty 없는 단지만
  const targets = force ? complexes : complexes.filter(c =>
    Array.isArray(c.unit_types) && c.unit_types.some(u => !u.house_ty)
  );

  console.log(`🏢 대상: ${targets.length.toLocaleString()}개\n`);
  if (!targets.length) { console.log('✅ 처리할 단지 없음'); return; }

  let done = 0, updated = 0;
  const now = new Date().toISOString();

  for (const c of targets) {
    if (!Array.isArray(c.unit_types) || c.unit_types.length === 0) { done++; continue; }

    const clustered = clusterUnitTypes(c.unit_types);

    if (kaptArg || dryRun) {
      console.log(`\n── ${c.name} (${c.kapt_code}) ──`);
      console.log('  원본:');
      for (const u of c.unit_types) {
        console.log(`    ${u.exclusive_pyeong}평 | ${u.exclusive_area}㎡ (${u.count}세대) house_ty=${u.house_ty ?? 'null'}`);
      }
      console.log('  클러스터 결과:');
      for (const u of clustered) {
        console.log(`    ${u.house_ty} | 전용${u.exclusive_area}㎡ 공급${u.supply_area}㎡ (${u.count}세대)`);
      }
    }

    if (!dryRun) {
      const { error } = await supabase
        .from('apartment_complexes')
        .update({ unit_types: clustered, updated_at: now })
        .eq('kapt_code', c.kapt_code);

      if (error) {
        console.error(`\n⚠️  DB 오류 [${c.name}]: ${error.message}`);
      } else {
        updated++;
      }
    }

    done++;
    if (!kaptArg && !dryRun && done % 100 === 0) {
      process.stdout.write(`\r  진행: ${done} / ${targets.length} | 업데이트: ${updated}`);
    }
  }

  if (!dryRun) {
    console.log(`\n\n🎉 완료! 업데이트: ${updated.toLocaleString()} / ${done.toLocaleString()}`);
  } else {
    console.log(`\n\n📋 dry-run 완료. 실제 업데이트하려면 --dry-run 없이 실행하세요.`);
  }
}

main().catch(e => { console.error('❌', e); process.exit(1); });
