/**
 * M prefix 단지에 관리비·주차 정보 보강
 *
 * A prefix (K-apt) 단지의 manage_cost, parking_total을
 * road_address 완전 일치 매칭으로 M prefix 단지에 복사한다.
 *
 * 매칭 전략:
 *   1순위: road_address 완전 일치
 *   2순위: road_address 일치 + total_units 유사 (중복 주소 구분)
 *
 * 실행: node scripts/enrich-molit-from-kapt.mjs
 * 옵션: --force  (이미 보강된 단지도 재처리)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const force = process.argv.includes('--force');

async function loadAllPages(query) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await query.order('kapt_code').range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!page?.length) break;
    rows.push(...page);
    from += 1000;
    if (page.length < 1000) break;
  }
  return rows;
}

async function main() {
  console.log('🔄 M prefix 관리비·주차 보강 시작 (road_address 매칭)');
  console.log(`   모드: ${force ? '전체 재처리' : '미보강만'}\n`);

  // ── 1. A prefix 소스 데이터 로드 ────────────────────────────────────────────
  console.log('📥 A prefix 데이터 로딩...');
  const aRows = await loadAllPages(
    supabase
      .from('apartment_complexes')
      .select('kapt_code, name, road_address, manage_cost, parking_total, total_units')
      .like('kapt_code', 'A%')
      .not('road_address', 'is', null)
  );

  // road_address → A prefix row(들) 맵
  const aMap = new Map(); // road_address → row[] (중복 대비 배열)
  for (const row of aRows) {
    const hasMc = row.manage_cost && Object.keys(row.manage_cost).length > 0;
    const hasPk = row.parking_total != null;
    if (!hasMc && !hasPk) continue;
    const addr = row.road_address.trim();
    if (!aMap.has(addr)) aMap.set(addr, []);
    aMap.get(addr).push(row);
  }
  console.log(`   A prefix 유효 단지: ${aRows.length.toLocaleString()}개 (관리비/주차 있는 것: ${aMap.size.toLocaleString()}개)\n`);

  // ── 2. M prefix 대상 로드 ────────────────────────────────────────────────────
  let mQuery = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, road_address, manage_cost, parking_total, total_units')
    .like('kapt_code', 'M%')
    .not('road_address', 'is', null);

  if (!force) {
    mQuery = mQuery.is('manage_cost', null).is('parking_total', null);
  }

  console.log('📥 M prefix 데이터 로딩...');
  const mComplexes = await loadAllPages(mQuery);
  console.log(`📍 M prefix 보강 대상: ${mComplexes.length.toLocaleString()}개\n`);

  // ── 3. 매칭 & 업데이트 ───────────────────────────────────────────────────────
  let matched = 0, ambiguous = 0, noMatch = 0, updated = 0;

  const BATCH = 50;
  for (let i = 0; i < mComplexes.length; i += BATCH) {
    const batch = mComplexes.slice(i, i + BATCH);

    const updates = [];
    for (const m of batch) {
      const addr = m.road_address.trim();
      const candidates = aMap.get(addr);

      if (!candidates?.length) { noMatch++; continue; }

      let src;
      if (candidates.length === 1) {
        src = candidates[0];
      } else {
        // 중복 주소: total_units가 가장 가까운 것 선택
        ambiguous++;
        if (m.total_units != null) {
          src = candidates.reduce((best, c) => {
            const db = Math.abs((c.total_units ?? 0) - m.total_units);
            const dBest = Math.abs((best.total_units ?? 0) - m.total_units);
            return db < dBest ? c : best;
          });
        } else {
          src = candidates[0]; // 세대수 없으면 첫 번째
        }
      }

      const update = {};
      const hasMc = src.manage_cost && Object.keys(src.manage_cost).length > 0;
      if (hasMc) update.manage_cost = src.manage_cost;
      if (src.parking_total != null) update.parking_total = src.parking_total;
      if (Object.keys(update).length === 0) { noMatch++; continue; }

      updates.push({ kapt_code: m.kapt_code, update });
      matched++;
    }

    for (const { kapt_code, update } of updates) {
      const { error } = await supabase
        .from('apartment_complexes')
        .update(update)
        .eq('kapt_code', kapt_code);
      if (error) console.error(`\n⚠️  ${kapt_code}:`, error.message);
      else updated++;
    }

    process.stdout.write(
      `\r  진행: ${Math.min(i + BATCH, mComplexes.length)}/${mComplexes.length} | 매칭: ${matched} | 미매칭: ${noMatch} | 업데이트: ${updated}`
        .padEnd(100).slice(0, 100)
    );
  }

  console.log('\n');
  console.log('🎉 완료!');
  console.log(`   매칭 성공: ${matched.toLocaleString()} (중복주소 처리: ${ambiguous})`);
  console.log(`   미매칭: ${noMatch.toLocaleString()}`);
  console.log(`   DB 업데이트: ${updated.toLocaleString()}`);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
