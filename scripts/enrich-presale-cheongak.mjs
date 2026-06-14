/**
 * 분양권/입주예정 단지 청약홈 보강
 *
 * unsold_listings의 house_manage_no로 청약홈 분양 상세를 조회해
 * apartment_complexes의 unit_types(공급면적)·total_units·built_year(입주예정연도)를 채운다.
 * enrich-cheongak은 built_year>=2020 단지만 처리해 분양권(built_year null) 단지가 누락됨.
 *
 * 실행: node scripts/enrich-presale-cheongak.mjs           # dry-run
 *       node scripts/enrich-presale-cheongak.mjs --confirm
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
const API_KEY = (process.env.PUBLIC_DATA_API_KEY ?? process.env.CHEONGAK_API_KEY)?.trim();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';
const DRY = !process.argv.includes('--confirm');
if (DRY) console.log('🔍 DRY-RUN\n');

function normName(s) { return (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase(); }

function parseHouseTy(raw) {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{3})\.(\d+)([A-Z]?)$/);
  if (!m) return null;
  return { exclusive_area: parseFloat(`${m[1]}.${m[2]}`), letter: m[3] ?? '' };
}
function parseMdlRecord(r) {
  const parsed = parseHouseTy(r.HOUSE_TY);
  if (!parsed) return null;
  const { exclusive_area, letter } = parsed;
  const suplyAr = parseFloat(r.SUPLY_AR ?? 0);
  const count = parseInt(r.SUPLY_HSHLDCO ?? 0) + parseInt(r.SPSPLY_HSHLDCO ?? 0);
  if (exclusive_area <= 0 || suplyAr <= 0) return null;
  const exclusivePy = Math.round(exclusive_area / 3.3);
  const supplyPy = Math.round(suplyAr / 3.3);
  return {
    house_ty: `${exclusivePy}평${letter}`,
    exclusive_area: Math.round(exclusive_area * 100) / 100,
    supply_area: Math.round(suplyAr * 100) / 100,
    exclusive_pyeong: exclusivePy,
    supply_pyeong: supplyPy,
    count: count > 0 ? count : null,
    source: 'cheongak',
    official_ty: `${Math.round(exclusive_area * 100) / 100}${letter}`,
  };
}
async function cheongak(endpoint, params) {
  const qs = new URLSearchParams({ serviceKey: API_KEY, page: '1', perPage: '100', ...params });
  try {
    const res = await fetch(`${BASE}/${endpoint}?${qs}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json())?.data ?? null;
  } catch { return null; }
}

// 미분양 + 청약(sale) 단지 모두 house_manage_no 보유 → 둘 다 처리
const { data: unsolds } = await sb.from('unsold_listings')
  .select('name, house_manage_no, lat, lng').not('house_manage_no', 'is', null);
console.log(`청약번호 보유 미분양: ${unsolds?.length ?? 0}개\n`);

let matched = 0, enriched = 0, noComplex = 0, noData = 0;
for (const u of unsolds ?? []) {
  if (!u.lat || !u.lng || !u.house_manage_no) continue;

  // 좌표 근접 active 단지 매칭 (≈400m bbox)
  const { data: near } = await sb.from('apartment_complexes')
    .select('kapt_code, name, unit_types, total_units, built_year, move_in_ym, winner_date')
    .neq('source', 'kapt_deprecated')
    .gte('lat', u.lat - 0.004).lte('lat', u.lat + 0.004)
    .gte('lng', u.lng - 0.005).lte('lng', u.lng + 0.005);
  // 이름 일치(완전 또는 부분포함)만 매칭 — 좌표만 가까운 다른 단지 오매칭 방지
  const un = normName(u.name);
  const cx = near?.find(c => { const cn = normName(c.name); return cn === un || cn.includes(un) || un.includes(cn); });
  if (!cx) { noComplex++; continue; }
  matched++;

  // 이미 청약홈 unit_types + 날짜까지 다 있으면 스킵
  const hasCheongak = Array.isArray(cx.unit_types) && cx.unit_types.some(t => t.source === 'cheongak');
  if (hasCheongak && cx.total_units && cx.built_year && cx.move_in_ym && cx.winner_date) continue;

  const [detail, mdl] = await Promise.all([
    cheongak('getAPTLttotPblancDetail', { 'cond[HOUSE_MANAGE_NO::EQ]': String(u.house_manage_no) }),
    cheongak('getAPTLttotPblancMdl', { 'cond[HOUSE_MANAGE_NO::EQ]': String(u.house_manage_no) }),
  ]);
  await sleep(120);

  const unitTypes = (mdl ?? []).map(parseMdlRecord).filter(Boolean);
  if (!unitTypes.length) { noData++; continue; }
  const totalUnits = unitTypes.reduce((s, t) => s + (t.count ?? 0), 0) || null;
  const d = detail?.[0];
  const moveInYm = d?.MVN_PREARNGE_YM ? String(d.MVN_PREARNGE_YM) : null;  // "202904"
  const winnerDate = d?.PRZWNER_PRESNATN_DE || null;                        // "2025-09-10"
  const builtYear = moveInYm ? parseInt(moveInYm.slice(0, 4)) : cx.built_year;

  console.log(`  ${cx.kapt_code} "${cx.name}" → ${unitTypes.length}타입, ${totalUnits}세대, 입주 ${moveInYm ?? '?'}, 당첨발표 ${winnerDate ?? '?'}`);

  if (!DRY) {
    const payload = { unit_types: unitTypes };
    if (totalUnits) payload.total_units = totalUnits;
    if (builtYear) payload.built_year = builtYear;
    if (moveInYm) payload.move_in_ym = moveInYm;
    if (winnerDate) payload.winner_date = winnerDate;
    const { error } = await sb.from('apartment_complexes').update(payload).eq('kapt_code', cx.kapt_code);
    if (error) console.error(`    ⚠️ ${error.message}`);
    else enriched++;
  } else enriched++;
}
console.log(`\n매칭 ${matched} | 보강 ${enriched} | 단지없음 ${noComplex} | 청약데이터없음 ${noData}`);
if (DRY) console.log('적용: node scripts/enrich-presale-cheongak.mjs --confirm');
