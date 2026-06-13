/**
 * 중복 단지 감지 — 같은 lawd_cd + 정규화 이름인데 별도 molit_key로 등록된 단지
 * (입주권 신고명과 매매 신고명의 띄어쓰기/표기 차이로 분리된 케이스)
 *
 * 실행: node scripts/detect-dup-complexes.mjs           # dry-run (그룹 목록)
 *       node scripts/detect-dup-complexes.mjs --confirm # 잉여 단지 deprecated 처리
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CONFIRM = process.argv.includes('--confirm');
if (!CONFIRM) console.log('🔍 DRY-RUN\n');

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
function utCount(ut) { return Array.isArray(ut) ? ut.length : 0; }

// active 전체 로드 (lawd_cd는 molit_key에서 추출)
const all = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('apartment_complexes')
    .select('kapt_code, name, molit_key, unit_types, source, lat')
    .neq('source', 'kapt_deprecated')
    .order('kapt_code')
    .range(from, from + 999);
  if (error) { console.error(error.message); break; }
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`active 단지: ${all.length}개`);

// lawd|normName 그룹핑
const groups = new Map();
for (const c of all) {
  if (!c.molit_key) continue;
  const lawd = c.molit_key.split('|')[0];
  const key = `${lawd}|${normName(c.name)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(c);
}

const dupGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);
console.log(`중복 그룹: ${dupGroups.length}개 (잉여 단지 ${dupGroups.reduce((s, [, a]) => s + a.length - 1, 0)}개)\n`);

const isA = (c) => !c.kapt_code.startsWith('M'); // K-apt 기반(메타데이터 보유) 우선
const toDeprecate = [];
const skipped = [];
for (const [key, arr] of dupGroups) {
  // 대표 선정: unit_types 많음 > K-apt(A-prefix) > 좌표 있음 > kapt_code 사전순
  arr.sort((a, b) =>
    utCount(b.unit_types) - utCount(a.unit_types) ||
    (isA(b) - isA(a)) ||
    ((b.lat != null) - (a.lat != null)) ||
    a.kapt_code.localeCompare(b.kapt_code));
  const [keep, ...drop] = arr;
  for (const d of drop) {
    // 안전 조건: drop은 M-prefix(MOLIT 생성)이고 unit_types 없는 것만 자동 처리.
    // A-prefix(K-apt)거나 unit_types 보유면 수동 검토 보류.
    if (d.kapt_code.startsWith('M') && utCount(d.unit_types) === 0) {
      toDeprecate.push({ ...d, keepCode: keep.kapt_code, keepName: keep.name });
    } else {
      skipped.push({ ...d, keepCode: keep.kapt_code, keepName: keep.name });
    }
  }
}

for (const d of toDeprecate.slice(0, 40)) {
  console.log(`  drop ${d.kapt_code} "${d.name}" (ut:${utCount(d.unit_types)}) → keep "${d.keepName}"`);
}
if (toDeprecate.length > 40) console.log(`  ... 외 ${toDeprecate.length - 40}개`);
console.log(`\n자동 처리 대상: ${toDeprecate.length}개 | 수동 검토 보류: ${skipped.length}개`);
if (skipped.length) {
  console.log('\n[보류 — A-prefix 또는 unit_types 보유]');
  for (const s of skipped.slice(0, 20)) console.log(`  ${s.kapt_code} "${s.name}" (ut:${utCount(s.unit_types)}) → keep "${s.keepName}"`);
  if (skipped.length > 20) console.log(`  ... 외 ${skipped.length - 20}개`);
}
console.log(`\n잉여 단지 총 ${toDeprecate.length}개`);

if (CONFIRM && toDeprecate.length) {
  let done = 0;
  for (const d of toDeprecate) {
    // 잉여 단지를 deprecated로 (지도/검색에서 제외, 데이터는 보존)
    const { error } = await sb.from('apartment_complexes')
      .update({ source: 'kapt_deprecated' }).eq('kapt_code', d.kapt_code);
    if (error) console.error(`  ⚠️ ${d.kapt_code}: ${error.message}`);
    else done++;
  }
  console.log(`\n✅ ${done}개 deprecated 처리`);
} else if (toDeprecate.length) {
  console.log('\n적용: node scripts/detect-dup-complexes.mjs --confirm');
}
