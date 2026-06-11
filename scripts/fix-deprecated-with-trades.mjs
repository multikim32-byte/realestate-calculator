/**
 * 두 가지 문제를 자동 수정 (lawd_cd 배치 처리):
 *
 * 【유형1】 deprecated인데 실거래 있는 단지 → source='molit' 복원
 * 【유형2】 unit_types 없는 active 단지에 deprecated 단지의 unit_types 재분배
 *
 * 실행: node scripts/fix-deprecated-with-trades.mjs
 * 옵션: --confirm  (실제 실행, 없으면 dry-run)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = !process.argv.includes('--confirm');
const SKIP_TYPE1 = process.argv.includes('--skip-type1');

if (DRY) console.log('🔍 DRY-RUN (--confirm 없음)\n');
if (SKIP_TYPE1) console.log('⏭️  유형1 스킵\n');

async function fetchAll(baseQuery) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await baseQuery.order('kapt_code').range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

// lawd_cd에 해당하는 apt_name Set 조회 (Supabase 기본 max 1000건씩 페이징)
async function getTradeNamesForLawd(lawd) {
  const names = new Set();
  let from = 0;
  while (true) {
    const { data } = await sb.from('apt_trades')
      .select('apt_name')
      .eq('lawd_cd', lawd)
      .order('apt_name')
      .range(from, from + 999);
    if (!data?.length) break;
    for (const t of data) names.add(t.apt_name);
    if (data.length < 1000) break;
    from += 1000;
  }
  return names;
}

// 특정 단지(lawd+name)의 거래 면적 Set 조회 (단지별 개별 쿼리, statement timeout 방지)
async function getDistinctAreasForApt(lawd, aptName) {
  const areas = new Set();
  let from = 0;
  while (true) {
    const { data } = await sb.from('apt_trades')
      .select('exclusive_area')
      .eq('lawd_cd', lawd)
      .eq('apt_name', aptName)
      .range(from, from + 999);
    if (!data?.length) break;
    for (const t of data) areas.add(Math.round(t.exclusive_area * 100) / 100);
    if (data.length < 1000) break;
    from += 1000;
  }
  return areas;
}

// 이름 유사도 (bigram)
function normName(s) { return (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase(); }
function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigrams = (s) => { const r = new Set(); for (let i = 0; i < s.length-1; i++) r.add(s.slice(i,i+2)); return r; };
  const ba = bigrams(na), bb = bigrams(nb);
  if (!ba.size || !bb.size) return 0;
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}

// ── 유형1 ─────────────────────────────────────────────────────────────────────
async function fixType1() {
  console.log('【유형1】 deprecated → active 복원\n');

  const depRows = await fetchAll(
    sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, total_units, unit_types')
      .eq('source', 'kapt_deprecated')
      .not('molit_key', 'is', null)
  );
  console.log(`  deprecated (molit_key 있음): ${depRows.length}개`);

  // active molit_key Set
  const activeRows = await fetchAll(
    sb.from('apartment_complexes')
      .select('molit_key')
      .eq('source', 'molit')
      .not('molit_key', 'is', null)
  );
  const activeMolitKeys = new Set(activeRows.map(r => r.molit_key));

  // active 없는 deprecated 목록
  const noActive = depRows.filter(r => !activeMolitKeys.has(r.molit_key));
  console.log(`  active 없는 deprecated: ${noActive.length}개`);

  // lawd_cd별로 그룹핑 후 apt_trades 조회
  const byLawd = new Map();
  for (const r of noActive) {
    const [lawd, apt] = r.molit_key.split('|');
    if (!byLawd.has(lawd)) byLawd.set(lawd, new Map());
    byLawd.get(lawd).set(apt, r);
  }

  const toRestore = [];
  let checked = 0;
  const totalLawd = byLawd.size;
  for (const [lawd, aptMap] of byLawd) {
    const tradeNames = await getTradeNamesForLawd(lawd);
    for (const [apt, r] of aptMap) {
      if (tradeNames.has(apt)) toRestore.push(r);
    }
    checked++;
    process.stdout.write(`\r  조회 중: ${checked}/${totalLawd} lawd_cd (복원 대상: ${toRestore.length})`);
  }
  console.log(`\n\n복원 대상: ${toRestore.length}개\n`);

  for (const r of toRestore.slice(0, 30)) {
    console.log(`  ${r.kapt_code} | ${r.name?.padEnd(25)} | ${r.molit_key}`);
  }
  if (toRestore.length > 30) console.log(`  ... 외 ${toRestore.length - 30}개`);

  if (!DRY && toRestore.length > 0) {
    console.log('\n복원 중...');
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < toRestore.length; i += BATCH) {
      const codes = toRestore.slice(i, i + BATCH).map(r => r.kapt_code);
      const { error } = await sb.from('apartment_complexes')
        .update({ source: 'molit' }).in('kapt_code', codes);
      if (error) console.error(`\n  ⚠️  ${error.message}`);
      else done += codes.length;
      process.stdout.write(`\r  ${done}/${toRestore.length}`);
    }
    console.log(`\n✅ ${done}개 복원 완료`);
  }

  return toRestore;
}

// Haversine 거리 (미터)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r) * Math.cos(lat2*d2r) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── 유형2 ─────────────────────────────────────────────────────────────────────
async function fixType2() {
  console.log('\n【유형2】 unit_types 재분배 (좌표+이름 매칭)\n');

  // active 전체 조회 → JS 필터 (unit_types is null 서버 필터가 statement timeout 유발)
  process.stdout.write('  active 단지 전체 조회...');
  const allActive = await fetchAll(
    sb.from('apartment_complexes')
      .select('kapt_code, name, lat, lng, molit_key, total_units')
      .eq('source', 'molit')
  );
  const noUT = allActive.filter(r => !r.lat || !r.molit_key ? false : true)
    .filter(r => {
      // unit_types는 select에서 제외했으므로 별도 확인 필요 없음 - 이미 noUT 목록임
      return true;
    });
  // unit_types가 null인지는 별도로 확인
  const { data: noUTCodes } = await sb.from('apartment_complexes')
    .select('kapt_code').eq('source','molit').is('unit_types', null)
    .not('molit_key','is',null).range(0, 999);
  // 3페이지 이내이므로 한번에
  let noUTSet = new Set(noUTCodes?.map(r => r.kapt_code) ?? []);
  let from2 = 1000;
  while (noUTCodes?.length >= 1000) {
    const { data: more } = await sb.from('apartment_complexes')
      .select('kapt_code').eq('source','molit').is('unit_types', null)
      .not('molit_key','is',null).range(from2, from2+999);
    if (!more?.length) break;
    for (const r of more) noUTSet.add(r.kapt_code);
    if (more.length < 1000) break;
    from2 += 1000;
  }

  const candidates = allActive.filter(r => noUTSet.has(r.kapt_code) && r.lat && r.molit_key);
  console.log(` ${candidates.length}개\n`);

  // deprecated unit_types 있는 단지 전체 조회
  process.stdout.write('  deprecated 단지 조회...');
  const depAll = await fetchAll(
    sb.from('apartment_complexes')
      .select('kapt_code, name, lat, lng, unit_types')
      .eq('source', 'kapt_deprecated')
  );
  const depUT = depAll.filter(r => r.unit_types && r.lat);
  console.log(` ${depUT.length}개 (좌표+unit_types)\n`);

  const updates = [];
  let checked = 0;
  for (const m of candidates) {
    const [lawd, aptName] = m.molit_key.split('|');

    // 좌표 1km 이내 + 이름 완전 일치 (다른 차수 단지 오매칭 방지)
    const normM = normName(m.name);
    const depCandidates = depUT.filter(d =>
      haversine(m.lat, m.lng, d.lat, d.lng) < 1000 &&
      normName(d.name) === normM
    );
    if (!depCandidates.length) { checked++; continue; }

    // 거래 면적으로 unit_types 매칭
    const myAreas = await getDistinctAreasForApt(lawd, aptName);
    if (!myAreas?.size) { checked++; continue; }

    let matchedTypes = [], bestDepName = '';
    for (const dep of depCandidates) {
      const utArr = Array.isArray(dep.unit_types) ? dep.unit_types : [];
      const matched = utArr.filter(u => {
        const ua = Math.round((u.exclusive_area ?? 0) * 100) / 100;
        return [...myAreas].some(ta => Math.abs(ta - ua) <= 0.5);
      });
      if (matched.length > matchedTypes.length) {
        matchedTypes = matched;
        bestDepName = dep.name;
      }
    }

    if (matchedTypes.length) {
      const unitCount = matchedTypes.reduce((s, u) => s + (u.count ?? 0), 0);
      updates.push({
        kapt_code: m.kapt_code,
        name: m.name,
        unit_types: matchedTypes,
        total_units: unitCount > 0 ? unitCount : m.total_units,
        depName: bestDepName,
      });
    }
    checked++;
    process.stdout.write(`\r  처리: ${checked}/${candidates.length}개 (재분배: ${updates.length})`);
  }
  console.log(`\n\n재분배 가능: ${updates.length}개\n`);

  for (const u of updates.slice(0, 20)) {
    const areas = u.unit_types.map(t => `${t.exclusive_area}㎡`).join(', ');
    console.log(`  ${u.name?.padEnd(25)} ← ${u.depName?.padEnd(25)} | ${areas} | ${u.total_units ?? '-'}세대`);
  }
  if (updates.length > 20) console.log(`  ... 외 ${updates.length - 20}개`);

  if (!DRY && updates.length > 0) {
    console.log('\n업데이트 중...');
    let done = 0;
    for (const u of updates) {
      const payload = { unit_types: u.unit_types };
      if (u.total_units) payload.total_units = u.total_units;
      const { error } = await sb.from('apartment_complexes')
        .update(payload).eq('kapt_code', u.kapt_code);
      if (error) console.error(`\n  ⚠️  ${u.kapt_code}: ${error.message}`);
      else done++;
      process.stdout.write(`\r  ${done}/${updates.length}`);
    }
    console.log(`\n✅ ${done}개 unit_types 재분배 완료`);
  }

  return updates;
}

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  Deprecated 단지 수정 스크립트');
  console.log(`  모드: ${DRY ? 'DRY-RUN' : '실제 실행'}`);
  console.log('══════════════════════════════════════════════════════\n');

  const restored = SKIP_TYPE1 ? [] : await fixType1();
  const redistributed = await fixType2();

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  결과: 복원 ${restored.length}개 | unit_types 재분배 ${redistributed.length}개`);
  if (DRY) console.log('\n  실제 실행: node scripts/fix-deprecated-with-trades.mjs --confirm');
  console.log('══════════════════════════════════════════════════════');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
