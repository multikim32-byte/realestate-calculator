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

if (DRY) console.log('🔍 DRY-RUN (--confirm 없음)\n');

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

// lawd_cd에 해당하는 apt_name → exclusive_area Set 조회
async function getTradeAreasForLawd(lawd) {
  const areasMap = new Map(); // apt_name → Set<area>
  let from = 0;
  while (true) {
    const { data } = await sb.from('apt_trades')
      .select('apt_name, exclusive_area')
      .eq('lawd_cd', lawd)
      .order('apt_name')
      .range(from, from + 999);
    if (!data?.length) break;
    for (const t of data) {
      if (!areasMap.has(t.apt_name)) areasMap.set(t.apt_name, new Set());
      areasMap.get(t.apt_name).add(Math.round(t.exclusive_area * 100) / 100);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return areasMap;
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

// ── 유형2 ─────────────────────────────────────────────────────────────────────
async function fixType2() {
  console.log('\n【유형2】 unit_types 재분배\n');

  // unit_types 없는 active 단지
  const noUT = await fetchAll(
    sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, total_units')
      .eq('source', 'molit')
      .is('unit_types', null)
      .not('molit_key', 'is', null)
  );
  console.log(`  unit_types 없는 active 단지: ${noUT.length}개`);

  // deprecated 단지 unit_types 인덱스 (lawd_cd 기준)
  const depUT = await fetchAll(
    sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, total_units, unit_types')
      .eq('source', 'kapt_deprecated')
      .not('unit_types', 'is', null)
  );
  const depByLawd = new Map();
  for (const d of depUT) {
    if (!d.molit_key) continue;
    const [lawd] = d.molit_key.split('|');
    if (!depByLawd.has(lawd)) depByLawd.set(lawd, []);
    depByLawd.get(lawd).push(d);
  }
  console.log(`  deprecated (unit_types 있음): ${depUT.length}개 (${depByLawd.size}개 lawd_cd)`);

  // noUT를 lawd_cd로 그룹핑 (deprecated 단지 있는 lawd만)
  const noUTbyLawd = new Map();
  for (const m of noUT) {
    const [lawd] = m.molit_key.split('|');
    if (!depByLawd.has(lawd)) continue;
    if (!noUTbyLawd.has(lawd)) noUTbyLawd.set(lawd, []);
    noUTbyLawd.get(lawd).push(m);
  }
  console.log(`  매칭 가능 lawd_cd: ${noUTbyLawd.size}개\n`);

  const updates = [];
  let checked = 0;
  for (const [lawd, mList] of noUTbyLawd) {
    const depCandidates = depByLawd.get(lawd) ?? [];
    // 해당 lawd_cd의 apt_trades 면적 인덱스 (apt_name → Set<area>)
    const areasMap = await getTradeAreasForLawd(lawd);

    for (const m of mList) {
      const [, aptName] = m.molit_key.split('|');
      const myAreas = areasMap.get(aptName);
      if (!myAreas?.size) continue;

      // deprecated 단지의 unit_types에서 내 거래 면적과 겹치는 타입 찾기
      // 이름 유사도 0.25 이상인 경우만 허용 (전혀 다른 단지 오매칭 방지)
      let matchedTypes = [];
      let bestDepName = '';
      for (const dep of depCandidates) {
        const sim = nameSimilarity(m.name, dep.name);
        if (sim < 0.25) continue; // 이름 유사도 최소 기준
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

      if (!matchedTypes.length) continue;
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
    process.stdout.write(`\r  처리: ${checked}/${noUTbyLawd.size} lawd_cd (재분배: ${updates.length})`);
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

  const restored = await fixType1();
  const redistributed = await fixType2();

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  결과: 복원 ${restored.length}개 | unit_types 재분배 ${redistributed.length}개`);
  if (DRY) console.log('\n  실제 실행: node scripts/fix-deprecated-with-trades.mjs --confirm');
  console.log('══════════════════════════════════════════════════════');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
