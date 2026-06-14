/**
 * avg_area(마커 ㎡ 표기용) 빈 단지 보강 — avg_price는 건드리지 않음
 *
 * avg_pyeong은 있는데 avg_area가 null인 단지(sido 표기차이 등으로 백필 누락,
 * 분양권 단지 등)의 대표 전용면적을 거래에서 계산해 채운다.
 *
 * 실행: node scripts/enrich-avg-area.mjs           # dry-run
 *       node scripts/enrich-avg-area.mjs --confirm
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = !process.argv.includes('--confirm');
if (DRY) console.log('🔍 DRY-RUN\n');

function recentFromYm(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`; }
const FROM = recentFromYm(24);

// 대상: avg_pyeong 있고 avg_area null, molit_key 있는 단지
const targets = [];
let from = 0;
while (true) {
  const { data } = await sb.from('apartment_complexes')
    .select('kapt_code, molit_key, avg_pyeong, avg_area')
    .eq('source', 'molit').not('avg_pyeong', 'is', null).is('avg_area', null).not('molit_key', 'is', null)
    .order('kapt_code').range(from, from + 999);
  if (!data?.length) break;
  targets.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`avg_area 빈 단지(avg_pyeong 있음): ${targets.length}개\n`);

let filled = 0, noTrade = 0;
for (const c of targets) {
  const [lawd, apt] = c.molit_key.split('|');
  const { data: tr } = await sb.from('apt_trades')
    .select('exclusive_area, deal_ym').eq('lawd_cd', lawd).eq('apt_name', apt)
    .in('deal_type', ['T', 'N']).gte('deal_ym', FROM).limit(3000);
  if (!tr?.length) { noTrade++; continue; }
  // 대표 평형(avg_pyeong) 그룹의 최빈 전용면적
  const freq = new Map();
  for (const t of tr) {
    if (Math.round((t.exclusive_area ?? 0) / 3.3058) !== c.avg_pyeong) continue;
    const a = Math.round((t.exclusive_area ?? 0) * 100) / 100;
    freq.set(a, (freq.get(a) ?? 0) + 1);
  }
  let area = null, max = 0;
  for (const [a, f] of freq) if (f > max) { max = f; area = a; }
  if (area == null) { // 대표평형 거래 없으면 전체 최빈
    for (const t of tr) { const a = Math.round((t.exclusive_area ?? 0) * 100) / 100; freq.set(a, (freq.get(a) ?? 0) + 1); }
    for (const [a, f] of freq) if (f > max) { max = f; area = a; }
  }
  if (area == null) { noTrade++; continue; }
  if (!DRY) {
    const { error } = await sb.from('apartment_complexes').update({ avg_area: area }).eq('kapt_code', c.kapt_code);
    if (error) console.error(`  ⚠️ ${c.kapt_code}: ${error.message}`);
    else filled++;
  } else filled++;
}
console.log(`${DRY ? '[DRY] ' : ''}avg_area 채움 ${filled} | 거래없음(스킵) ${noTrade}`);
if (DRY) console.log('적용: node scripts/enrich-avg-area.mjs --confirm');
