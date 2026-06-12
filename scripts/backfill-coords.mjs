/**
 * 좌표 없는 active 단지 보강 (지도 마커 미표시 해결)
 *
 * lat IS NULL인 source='molit' 단지를 대상으로:
 *  1) molit_key → apt_trades에서 dong/jibun 확보 → 카카오 주소 검색
 *  2) 실패 시 카카오 키워드 검색 (sigungu + name, 카테고리 아파트, 주소에 시군구 포함 확인)
 *
 * 실행: node scripts/backfill-coords.mjs           # dry-run
 *       node scripts/backfill-coords.mjs --confirm
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KAKAO = process.env.KAKAO_REST_API_KEY;
const DRY = !process.argv.includes('--confirm');
if (DRY) console.log('🔍 DRY-RUN (--confirm 없음)\n');

// active 전체 → JS 필터 (lat null 서버 필터는 timeout 위험)
const all = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu, dong, lat, molit_key, source')
    .eq('source', 'molit')
    .order('kapt_code')
    .range(from, from + 999);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
const targets = all.filter(r => r.lat == null);
console.log(`좌표 없는 active 단지: ${targets.length}개\n`);

async function kakaoAddr(q) {
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&analyze_type=similar`,
    { headers: { Authorization: `KakaoAK ${KAKAO}` }, signal: AbortSignal.timeout(5000) });
  const j = await r.json();
  const d = j.documents?.[0];
  return d ? { lat: parseFloat(d.y), lng: parseFloat(d.x) } : null;
}
async function kakaoKeyword(q, sigungu) {
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}`,
    { headers: { Authorization: `KakaoAK ${KAKAO}` }, signal: AbortSignal.timeout(5000) });
  const j = await r.json();
  const d = j.documents?.find(x => x.category_name?.includes('아파트') && x.address_name?.includes(sigungu));
  return d ? { lat: parseFloat(d.y), lng: parseFloat(d.x) } : null;
}

let ok = 0, fail = 0, done = 0;
for (const c of targets) {
  done++;
  let geo = null;

  // 1) molit_key → 거래에서 jibun 확보 → 주소 검색
  if (c.molit_key) {
    const [lawd, aptName] = c.molit_key.split('|');
    const { data: tr } = await sb.from('apt_trades')
      .select('dong, jibun')
      .eq('lawd_cd', lawd).eq('apt_name', aptName)
      .not('jibun', 'is', null)
      .limit(1);
    const t = tr?.[0];
    if (t?.jibun) geo = await kakaoAddr(`${c.sido} ${c.sigungu} ${t.dong ?? c.dong ?? ''} ${t.jibun}`.replace(/\s+/g, ' ').trim());
  }

  // 2) 키워드 폴백
  if (!geo) geo = await kakaoKeyword(`${c.sigungu} ${c.name}`, c.sigungu);

  if (geo) {
    ok++;
    if (!DRY) {
      const { error } = await sb.from('apartment_complexes')
        .update({ lat: geo.lat, lng: geo.lng }).eq('kapt_code', c.kapt_code);
      if (error) console.error(`\n⚠️ ${c.kapt_code}: ${error.message}`);
    }
  } else {
    fail++;
    console.log(`\n  ❌ 좌표 실패: ${c.kapt_code} | ${c.sido} ${c.sigungu} | ${c.name}`);
  }
  process.stdout.write(`\r  진행: ${done}/${targets.length} (성공 ${ok}, 실패 ${fail})`);
  await sleep(120);
}
console.log(`\n\n${DRY ? '[DRY] ' : ''}완료 — 성공 ${ok} / 실패 ${fail}`);
if (DRY && ok) console.log('실제 반영: node scripts/backfill-coords.mjs --confirm');
