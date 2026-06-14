/**
 * 비공식 공급면적 null 초기화 (K-apt·trade·trades 등)
 * K-apt 공급면적 = 관리비 부과면적이라 실제와 다름. 추정(trade) 공급면적도 부정확.
 * cheongak(청약홈 공식)·manual(수동 검증) source만 유지.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');
const PAGE = 500;

async function main() {
  console.log(DRY_RUN ? '[DRY RUN]' : '[LIVE]', 'K-apt supply_area 초기화 시작');

  let processed = 0, updated = 0, skipped = 0, from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('apartment_complexes')
      .select('kapt_code, unit_types')
      .not('unit_types', 'is', null)
      .neq('unit_types', '[]')
      .order('kapt_code') // 정렬 필수 — 없으면 offset 페이징이 행 건너뜀
      .range(from, from + PAGE - 1);

    if (error) { console.error(error); break; }
    if (!data || !data.length) break;

    const KEEP = new Set(['cheongak', 'manual']); // 유효 공급면적 source
    for (const row of data) {
      const types = row.unit_types ?? [];
      // 전부 유효 source면 skip
      if (types.every(t => KEEP.has(t.source))) { skipped++; continue; }

      let changed = false;
      const newTypes = types.map(t => {
        if (KEEP.has(t.source)) return t; // 청약홈·수동 데이터는 유지
        if (t.supply_area == null && t.supply_pyeong == null) return t; // 이미 null
        changed = true;
        return { ...t, supply_area: null, supply_pyeong: null };
      });

      if (!changed) { skipped++; continue; }

      processed++;
      if (!DRY_RUN) {
        const { error: ue } = await supabase
          .from('apartment_complexes')
          .update({ unit_types: newTypes })
          .eq('kapt_code', row.kapt_code);
        if (ue) { console.error(`  오류 ${row.kapt_code}:`, ue.message); continue; }
        updated++;
      } else {
        updated++;
        if (updated <= 3) {
          console.log(`  예시 ${row.kapt_code}:`, newTypes.slice(0, 2));
        }
      }
    }

    from += PAGE;
    process.stdout.write(`\r  진행: ${from}개 조회, ${updated}개 업데이트`);
    if (data.length < PAGE) break;
  }

  console.log(`\n완료: ${updated}개 업데이트, ${skipped}개 스킵`);
}

main().catch(e => { console.error(e); process.exit(1); });
