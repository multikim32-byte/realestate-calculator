/**
 * 개명/리브랜딩 단지 감지 — 카카오 장소명과 대조
 *
 * M-prefix(MOLIT 생성) 단지의 이름을 카카오 키워드 검색 결과와 비교해,
 * 같은 위치(300m 이내) 아파트인데 이름이 전혀 다르면 개명으로 판단하고
 * name·slug를 카카오 이름으로 갱신한다. molit_key는 신고명 유지(실거래 매칭용).
 *
 * 실행: node scripts/detect-renamed-complexes.mjs           # dry-run
 *       node scripts/detect-renamed-complexes.mjs --confirm # 실제 갱신
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

const BRAND_NORM = [
  [/^lg/i, '엘지'], [/^gs/i, '지에스'], [/^sk/i, '에스케이'],
  [/^kcc/i, '케이씨씨'], [/^hdc/i, '에이치디씨'], [/^dl/i, '디엘'],
  [/^e편한세상/, '이편한세상'], [/^eg/i, '이지'],
];
function normName(s) {
  let n = (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  for (const [pat, rep] of BRAND_NORM) n = n.replace(pat, rep);
  return n;
}
function matchName(a, b) {
  const na = normName(a), nb = normName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r) * Math.cos(lat2*d2r) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function cleanPlaceName(s) {
  return (s ?? '').replace(/\([^)]*\)\s*$/, '').replace(/아파트$/, '').trim();
}

const SIDO_MAP = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
  '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
  '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기',
  '강원특별자치도': '강원', '강원도': '강원', '충청북도': '충북',
  '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
  '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주',
};
function makeSlug(sido, sigungu, name) {
  const sidoAbbr = SIDO_MAP[sido] ?? (sido ?? '').replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  const norm = (s) => (s ?? '').replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
  return `${norm(sidoAbbr)}-${norm(sigungu)}-${norm(name)}`;
}

// M-prefix + molit_key + 좌표 있는 단지 전체
const rows = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu, lat, lng, molit_key')
    .like('kapt_code', 'M%')
    .eq('source', 'molit')
    .not('lat', 'is', null)
    .order('kapt_code')
    .range(from, from + 999);
  if (error) { console.error(error.message); break; }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`검사 대상 (M-prefix, 좌표 있음): ${rows.length.toLocaleString()}개\n`);

const renamed = [];
let checked = 0, apiErr = 0;
for (const c of rows) {
  checked++;
  try {
    const q = `${c.sigungu} ${c.name}`;
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO}` }, signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const doc = json.documents?.find(d => d.category_name?.includes('아파트'));
    if (doc && haversineM(c.lat, c.lng, parseFloat(doc.y), parseFloat(doc.x)) <= 300) {
      const kakaoName = cleanPlaceName(doc.place_name);
      if (kakaoName && !matchName(kakaoName, c.name)) {
        renamed.push({ ...c, newName: kakaoName, kakaoRaw: doc.place_name });
        console.log(`\n  📛 ${c.kapt_code} | ${c.name} → ${kakaoName}  (카카오: ${doc.place_name})`);
      }
    }
  } catch { apiErr++; }
  if (checked % 100 === 0) process.stdout.write(`\r  진행: ${checked}/${rows.length} (감지: ${renamed.length}, 오류: ${apiErr})`);
  await sleep(40);
}
console.log(`\n\n감지: ${renamed.length}개 (API 오류 ${apiErr}건)\n`);

if (!DRY && renamed.length) {
  let done = 0;
  for (const r of renamed) {
    const { error } = await sb.from('apartment_complexes')
      .update({ name: r.newName, slug: `${makeSlug(r.sido, r.sigungu, r.newName)}-${r.kapt_code.toLowerCase()}` })
      .eq('kapt_code', r.kapt_code);
    if (error) console.error(`  ⚠️ ${r.kapt_code}: ${error.message}`);
    else done++;
  }
  console.log(`✅ ${done}개 이름 갱신 완료`);
} else if (renamed.length) {
  console.log('실제 갱신: node scripts/detect-renamed-complexes.mjs --confirm');
}
