/**
 * K-apt unit_types의 supply_area·supply_pyeong을 null로 초기화
 * cheongak source는 공식 공급면적이 정확하므로 유지
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
      .range(from, from + PAGE - 1);

    if (error) { console.error(error); break; }
    if (!data || !data.length) break;

    for (const row of data) {
      const types = row.unit_types ?? [];
      // cheongak source가 하나라도 있으면 전부 cheongak → skip
      if (types.every(t => t.source === 'cheongak')) { skipped++; continue; }

      let changed = false;
      const newTypes = types.map(t => {
        if (t.source === 'cheongak') return t; // 청약홈 데이터는 유지
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
