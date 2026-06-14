/**
 * 카카오 지도 기반 입주예정일 보강 (분양/입주예정 단지)
 *
 * 카카오는 분양예정 아파트를 place_name에 "(YYYY년MM월예정)"으로 표시한다.
 * 청약홈 공고가 옛 일정이거나(임의공급 재공고로 지연), 청약홈에 없는 단지의
 * 입주예정을 카카오에서 가져와 move_in_ym·built_year 갱신.
 *
 * 대상: source=molit, (built_year>=올해 OR move_in_ym 있음) 인 분양/입주예정 단지.
 * 실행: node scripts/enrich-kakao-movein.mjs           # dry-run
 *       node scripts/enrich-kakao-movein.mjs --confirm
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KAKAO = process.env.KAKAO_REST_API_KEY;
const DRY = !process.argv.includes('--confirm');
const NOW_YEAR = new Date().getFullYear();
if (DRY) console.log('🔍 DRY-RUN\n');

function hav(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const dl = (c - a) * r, dn = (d - b) * r;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// 카카오 place_name의 (YYYY년MM월예정) → "YYYYMM"
async function kakaoMoveIn(sigungu, name, lat, lng) {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sigungu} ${name}`)}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO}` }, signal: AbortSignal.timeout(5000) });
    const j = await res.json();
    const doc = (j.documents ?? []).find(d => d.category_name?.includes('아파트') &&
      (!lat || hav(lat, lng, parseFloat(d.y), parseFloat(d.x)) < 300));
    if (!doc) return null;
    const m = doc.place_name?.match(/\((\d{4})년\s*(\d{1,2})월\s*예정\)/);
    return m ? `${m[1]}${m[2].padStart(2, '0')}` : null;
  } catch { return null; }
}

// 대상 로드 (분양/입주예정 단지)
const all = [];
let from = 0;
while (true) {
  const { data } = await sb.from('apartment_complexes')
    .select('kapt_code, name, sigungu, lat, lng, built_year, move_in_ym')
    .eq('source', 'molit').not('lat', 'is', null).order('kapt_code').range(from, from + 999);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
const targets = all.filter(c => (c.built_year && c.built_year >= NOW_YEAR) || c.move_in_ym);
console.log(`분양/입주예정 단지: ${targets.length}개\n`);

let checked = 0, updated = 0;
for (const c of targets) {
  checked++;
  const km = await kakaoMoveIn(c.sigungu, c.name, c.lat, c.lng);
  await sleep(40);
  if (!km) continue;
  if (km === c.move_in_ym) continue; // 동일 → 스킵
  const newYear = parseInt(km.slice(0, 4));
  console.log(`  ${c.name}: ${c.move_in_ym ?? '(없음)'} → ${km} (built ${c.built_year}→${newYear})`);
  if (!DRY) {
    const { error } = await sb.from('apartment_complexes')
      .update({ move_in_ym: km, built_year: newYear }).eq('kapt_code', c.kapt_code);
    if (error) console.error(`    ⚠️ ${error.message}`);
    else updated++;
  } else updated++;
  if (checked % 50 === 0) process.stdout.write(`\r  진행 ${checked}/${targets.length} (갱신 ${updated})\n`);
}
console.log(`\n${DRY ? '[DRY] ' : ''}대상 ${targets.length} | 카카오 입주예정 갱신 ${updated}개`);
if (DRY) console.log('적용: node scripts/enrich-kakao-movein.mjs --confirm');
