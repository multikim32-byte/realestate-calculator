/**
 * deprecated K-apt 트윈 → 활성 MOLIT 단지로 메타데이터 이전
 *
 * 이름 변형(시그니쳐/시그니처 등)으로 K-apt 단지가 deprecated 되면서,
 * 활성 MOLIT 단지에 세대수·도로명·교통·관리비 등 K-apt 메타데이터가
 * 이전되지 못한 경우를 보정한다.
 *
 * 규칙:
 *  - 활성(source != kapt_deprecated)이 해당 필드가 비어있을 때만 채움(덮어쓰기 금지)
 *  - 같은 좌표(<50m) + 이름 trigram 유사도 >= 0.6 인 deprecated 트윈에서만 가져옴
 *  - unit_types·avg_*·name·slug·molit_key·source·lat/lng·built_year(있으면)는 보존
 *  - K-apt 공급면적 절대규칙 유지: unit_types는 손대지 않음
 *
 * 실행: node scripts/transfer-kapt-metadata.mjs            # dry-run
 *       node scripts/transfer-kapt-metadata.mjs --confirm
 *       node scripts/transfer-kapt-metadata.mjs --only=M95555360
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = !process.argv.includes('--confirm');
const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1] ?? null;
if (DRY) console.log('🔍 DRY-RUN (적용하려면 --confirm)\n');

function hav(a, b, c, d) { const R = 6371000, r = Math.PI / 180; const dl = (c - a) * r, dn = (d - b) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
function nn(s) { return (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase(); }
function trig(s) { const n = nn(s); const t = new Set(); for (let i = 0; i < n.length - 1; i++) t.add(n.slice(i, i + 2)); return t; }
function sim(a, b) { const ta = trig(a), tb = trig(b); if (!ta.size || !tb.size) return 0; let s = 0; for (const g of ta) if (tb.has(g)) s++; return 2 * s / (ta.size + tb.size); }

// 활성이 "비어있다" 판정
function empty(v) {
  if (v == null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

// 이전 대상 필드 (K-apt 메타데이터). unit_types·avg_*·name·slug·molit_key·좌표·source 제외
const FIELDS = [
  'total_units', 'floor_count', 'dong_count', 'parking_total', 'cctv_count',
  'nearby_transit', 'nearby_schools', 'nearby_infra', 'nearby_subway',
  'heating_type', 'builder', 'welfare_facility', 'education_facility',
  'phone', 'fax', 'bjd_code', 'kapt_addr', 'road_address', 'manage_cost',
];
const FILLABLE = ['built_year']; // 활성이 null일 때만 추가로 채움

// 전체 로드
const all = [];
let from = 0;
while (true) {
  const { data } = await sb.from('apartment_complexes')
    .select('kapt_code,name,lat,lng,source,' + FIELDS.join(',') + ',built_year')
    .not('lat', 'is', null).order('kapt_code').range(from, from + 999);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
const active = all.filter(c => c.source !== 'kapt_deprecated');
const dep = all.filter(c => c.source === 'kapt_deprecated' && c.total_units);
console.log(`활성 ${active.length} | deprecated+세대수 ${dep.length}\n`);

let updated = 0, totalFields = 0; const log = [];
for (const c of active) {
  if (ONLY && c.kapt_code !== ONLY) continue;
  // 핵심 조건: total_units가 비어있는 단지만 = K-apt 연결이 통째로 안 된 단지.
  // (이미 K-apt 데이터 있는 단지에 인접 別단지 필드가 끼어드는 교차오염 방지)
  if (!empty(c.total_units)) continue;
  // 트윈 탐색
  let best = null, bestSim = 0;
  for (const d of dep) {
    if (Math.abs(d.lat - c.lat) > 0.0005 || Math.abs(d.lng - c.lng) > 0.0007) continue;
    if (hav(c.lat, c.lng, d.lat, d.lng) > 50) continue;
    const s = sim(c.name, d.name);
    if (s >= 0.6 && s > bestSim) { bestSim = s; best = d; }
  }
  if (!best) continue;

  const patch = {};
  for (const f of FIELDS) if (empty(c[f]) && !empty(best[f])) patch[f] = best[f];
  for (const f of FILLABLE) if (c[f] == null && best[f] != null) patch[f] = best[f];
  const keys = Object.keys(patch);
  if (!keys.length) continue;

  totalFields += keys.length;
  log.push(`"${c.name}"(${c.kapt_code}) ← "${best.name}"(${best.kapt_code}) sim=${bestSim.toFixed(2)}: ${keys.join(',')}`);
  if (!DRY) {
    const { error } = await sb.from('apartment_complexes').update({ ...patch, updated_at: new Date().toISOString() }).eq('kapt_code', c.kapt_code);
    if (error) { console.error(`  ⚠️ ${c.kapt_code}: ${error.message}`); continue; }
  }
  updated++;
}

for (const l of log.slice(0, ONLY ? 50 : 30)) console.log('  ' + l);
if (log.length > 30 && !ONLY) console.log(`  ... 외 ${log.length - 30}개`);
console.log(`\n${DRY ? '[DRY] ' : ''}이전 단지 ${updated}개 / 총 ${totalFields}개 필드`);
if (DRY) console.log('적용: node scripts/transfer-kapt-metadata.mjs --confirm');
