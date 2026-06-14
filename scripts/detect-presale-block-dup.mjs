/**
 * 분양 블록명 중복 단지 감지·정리
 *
 * 분양권(N)은 분양 블록명("OO푸르지오 (A9블럭)")으로, 매매(T)는 입주명("옥정센트럴파크푸르지오")으로
 * 신고돼 같은 단지가 둘로 생긴 케이스. 입주 후 거래되는 단지가 이미 있으면 블록명 단지는 잉여.
 *
 * 기준: N거래 있고 T거래 0 + 가까운 곳(≤80m)에 입주완료 단지(built_year 과거 + total_units)가 있으면 deprecated.
 * 실행: node scripts/detect-presale-block-dup.mjs           # dry-run
 *       node scripts/detect-presale-block-dup.mjs --confirm
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');
const CONFIRM = process.argv.includes('--confirm');
const NOW_YEAR = new Date().getFullYear();
if (!CONFIRM) console.log('🔍 DRY-RUN\n');

function hav(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const dl = (c - a) * r, dn = (d - b) * r;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function trig(s) { const n = (s ?? '').replace(/\s+/g, '').toLowerCase(); const t = new Set(); for (let i = 0; i < n.length - 2; i++) t.add(n.slice(i, i + 3)); return t; }
function trigSim(a, b) { const ta = trig(a), tb = trig(b); if (!ta.size || !tb.size) return 0; let s = 0; for (const g of ta) if (tb.has(g)) s++; return (2 * s) / (ta.size + tb.size); }
// 차수 추출: "2단지"→2, "1차"→1, "A10-2BL"→2(블록), "3-1블럭"→3, 없으면 null
function phaseNo(name) {
  const m = name.match(/(\d+)\s*단지/) || name.match(/(\d+)\s*차/)
    || name.match(/[A-Z]?\d*-?(\d+)\s*BL/i) || name.match(/(\d+)[-\s\d]*블\s*[록럭]/);
  return m ? parseInt(m[1]) : null;
}
// 정규화: 괄호(반각·전각)·블록표기·아파트·공백 제거, 소문자
function norm(s) {
  return (s ?? '').replace(/[（(][^）)]*[）)]/g, '').replace(/[A-Za-z]?\d+-?\d*\s*BL/gi, '')
    .replace(/아파트/g, '').replace(/\s+/g, '').toLowerCase();
}
// 핵심부: 차수/단지/블록 표기까지 제거 (글자 비교용)
function core(s) { return norm(s).replace(/\d+단지|\d+차|단지|블록|블럭/g, ''); }
const sortChars = s => [...s].sort().join('');
function lcpLen(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
// 이름이 같은 단지인지 (글자재배열 동일 / 포함관계 / 긴 공통접두) — 차수는 별도 검증
function sameComplexName(a, b) {
  const ca = core(a), cb = core(b);
  if (!ca || !cb) return false;
  if (sortChars(ca) === sortChars(cb)) return true;          // 글자 재배열 동일 (분양명↔입주명 순서차이)
  if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true; // 포함관계
  if (lcpLen(ca, cb) >= 8) return true;                      // 긴 공통접두(지역+브랜드) — 접미 마케팅명만 차이
  return false;
}

// 분양권(N) 거래 단지키
const lawds = [];
for (const list of Object.values(LAWD_CODE_MAP)) for (const d of list) lawds.push(d.code);
const nKeys = new Set();
process.stdout.write('분양권 거래키 수집...');
for (const lawd of lawds) {
  let lastId = 0;
  while (true) { // 페이징 (1000건 초과 lawd에서 단지명 누락 방지 — 양주 등)
    const { data } = await sb.from('apt_trades').select('id, apt_name')
      .eq('lawd_cd', lawd).eq('deal_type', 'N').gt('id', lastId).order('id').limit(1000);
    if (!data?.length) break;
    for (const r of data) nKeys.add(`${lawd}|${r.apt_name}`);
    lastId = data[data.length - 1].id;
    if (data.length < 1000) break;
  }
}
console.log(` ${nKeys.size}개`);

// active 단지 전체 (좌표 있음)
const all = [];
let from = 0;
while (true) {
  const { data } = await sb.from('apartment_complexes')
    .select('kapt_code, name, lat, lng, molit_key, built_year, total_units')
    .neq('source', 'kapt_deprecated').not('lat', 'is', null).order('kapt_code').range(from, from + 999);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`active(좌표): ${all.length}개`);

// 입주완료 단지 (built_year 과거 + total_units)
const built = all.filter(c => c.built_year && c.built_year <= NOW_YEAR && c.total_units);

// 후보: N거래 있는 단지
const candidates = all.filter(c => c.molit_key && nKeys.has(c.molit_key));
console.log(`N거래 단지: ${candidates.length}개 → 입주단지 근접 검사\n`);

const dups = [];
let checked = 0;
for (const c of candidates) {
  checked++;
  // 80m 이내 입주완료 단지 중 "이름이 같고 차수가 같은" 단지 (가장 가까운 것)
  const pc = phaseNo(c.name);
  const near = built
    .filter(b => b.kapt_code !== c.kapt_code &&
      Math.abs(b.lat - c.lat) < 0.001 && Math.abs(b.lng - c.lng) < 0.0012 &&
      hav(c.lat, c.lng, b.lat, b.lng) <= 80 &&
      sameComplexName(c.name, b.name) &&
      !(pc !== null && phaseNo(b.name) !== null && pc !== phaseNo(b.name)))
    .sort((x, y) => hav(c.lat, c.lng, x.lat, x.lng) - hav(c.lat, c.lng, y.lat, y.lng))[0];
  if (!near) continue;
  const dist = Math.round(hav(c.lat, c.lng, near.lat, near.lng));
  // C의 매매(T) 거래 0 + keep의 매매 T>0 확인
  const [lawd, apt] = c.molit_key.split('|');
  const { count: tC } = await sb.from('apt_trades').select('*', { count: 'exact', head: true })
    .eq('lawd_cd', lawd).eq('apt_name', apt).eq('deal_type', 'T');
  if (tC && tC > 0) continue; // 매매 있으면 입주명 단지 — 잉여 아님
  const [klawd, kapt] = (near.molit_key ?? '|').split('|');
  const { count: ktC } = await sb.from('apt_trades').select('*', { count: 'exact', head: true })
    .eq('lawd_cd', klawd).eq('apt_name', kapt).eq('deal_type', 'T');
  if (!ktC) continue; // keep이 매매 없으면 입주 단지 확신 못함 — 보류
  dups.push({ ...c, keepName: near.name, keepCode: near.kapt_code, dist });
  process.stdout.write(`\r  검사 ${checked}/${candidates.length} (중복 ${dups.length})`);
}
console.log(`\n\n분양 블록명 중복 ${dups.length}개:\n`);
for (const d of dups) console.log(`  drop "${d.name}" (${d.kapt_code}) → keep "${d.keepName}" (${d.dist}m)`);

if (CONFIRM && dups.length) {
  let done = 0;
  for (const d of dups) {
    const { error } = await sb.from('apartment_complexes').update({ source: 'kapt_deprecated' }).eq('kapt_code', d.kapt_code);
    if (error) console.error(`  ⚠️ ${d.kapt_code}: ${error.message}`);
    else done++;
  }
  console.log(`\n✅ ${done}개 deprecated`);
} else if (dups.length) {
  console.log('\n적용: node scripts/detect-presale-block-dup.mjs --confirm');
}
