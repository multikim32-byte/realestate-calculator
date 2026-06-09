/**
 * unit_types 보강 스크립트 v6 (MOLIT 실거래 기준)
 *
 * 순서:
 *  1) apt_trades DISTINCT exclusive_area → 실제 거래된 면적 목록 (진실)
 *  2) DB에 이미 저장된 unit_types의 supply_area 재활용 (cheongak/수동 입력 등)
 *  3) 매칭 없으면 전용×1.3 추정 + auto house_ty (84A/B)
 *
 * K-apt API 호출 없음 — K-apt 면적 데이터 사용 안 함
 *
 * 실행: node scripts/enrich-unit-types.mjs
 * 옵션:
 *   --force        기존 unit_types 덮어쓰기 (기본: null인 단지만)
 *   --test         첫 5개만 실행, 상세 로그
 *   --kapt=XXXXX   특정 단지 1개만
 *   --limit=N      최대 N개 처리
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);

const force    = process.argv.includes('--force');
const testMode = process.argv.includes('--test');
const kaptArg  = process.argv.find(a => a.startsWith('--kapt='))?.replace('--kapt=', '');
const limitArg = process.argv.find(a => a.startsWith('--limit='))?.replace('--limit=', '');
const LIMIT    = limitArg ? parseInt(limitArg) : (testMode ? 5 : Infinity);

// ── 1단계: apt_trades에서 실거래 면적 목록 추출 ───────────────────────────────
async function fetchTradesAreas(lawdCd, aptName) {
  if (!lawdCd || !aptName) return [];
  try {
    const { data, error } = await supabase
      .from('apt_trades')
      .select('exclusive_area')
      .eq('lawd_cd', lawdCd)
      .eq('apt_name', aptName)
      .eq('deal_type', 'T')
      .not('exclusive_area', 'is', null);
    if (error || !data?.length) return [];

    const counts = new Map();
    for (const row of data) {
      const area = Math.round(parseFloat(row.exclusive_area) * 100) / 100;
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }

    // 2건 이상 등장한 면적만 (단순 오기 제거)
    const areas = [...counts.entries()]
      .filter(([, cnt]) => cnt >= 2)
      .sort(([a], [b]) => a - b);

    // floor(area) 기준 버킷 → A/B/C 코드 부여
    const buckets = new Map();
    for (const [area] of areas) {
      const key = Math.floor(area);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(area);
    }

    return areas.map(([area, count]) => {
      const bucket = buckets.get(Math.floor(area)) ?? [area];
      const idx    = bucket.indexOf(area);
      const letter = bucket.length > 1 ? String.fromCharCode(65 + idx) : '';
      return {
        exclusive_area:   area,
        exclusive_pyeong: Math.round(area / 3.3),
        count,
        auto_house_ty:    `${Math.floor(area)}${letter}`,
      };
    });
  } catch { return []; }
}

// ── 2단계: 기존 DB unit_types에서 supply_area 매칭 (±1㎡) ────────────────────
function matchSupplyArea(tradesAreas, existingUnitTypes) {
  if (!existingUnitTypes?.length) return tradesAreas.map(t => ({ ...t, supply_area: null, house_ty: null }));

  return tradesAreas.map(trade => {
    // 기존 unit_types에서 가장 가까운 exclusive_area 찾기
    let best = null, bestDiff = Infinity;
    for (const existing of existingUnitTypes) {
      if (!existing.exclusive_area) continue;
      const diff = Math.abs(existing.exclusive_area - trade.exclusive_area);
      if (diff < bestDiff) { bestDiff = diff; best = existing; }
    }

    if (best && bestDiff <= 1.0 && best.supply_area) {
      return {
        ...trade,
        house_ty:      best.house_ty ?? trade.auto_house_ty,
        supply_area:   best.supply_area,
        supply_pyeong: best.supply_pyeong ?? Math.round(best.supply_area / 3.3),
        source:        best.source === 'cheongak' ? 'molit+cheongak' : 'molit+existing',
      };
    }

    // 매칭 없음 → 전용 × 1.3 추정
    const est = Math.round(trade.exclusive_area * 1.3 * 100) / 100;
    return {
      exclusive_area:   trade.exclusive_area,
      exclusive_pyeong: trade.exclusive_pyeong,
      supply_area:      est,
      supply_pyeong:    Math.round(est / 3.3),
      house_ty:         trade.auto_house_ty,
      count:            trade.count,
      source:           'molit',
    };
  });
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  unit_types 보강 시작 (MOLIT 실거래 기준, K-apt API 미사용)');
  console.log(`   모드: ${force ? '전체 재처리' : 'unit_types=null만'} | test: ${testMode}\n`);

  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, molit_key, unit_types');

  if (kaptArg) {
    query = query.eq('kapt_code', kaptArg);
  } else if (!force) {
    query = query.is('unit_types', null);
  }

  const complexes = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.order('kapt_code').range(from, from + 999);
    if (error || !data?.length) break;
    complexes.push(...data);
    if (data.length < 1000 || complexes.length >= LIMIT) break;
    from += 1000;
  }

  const targets = complexes.slice(0, LIMIT);
  console.log(`🏢 대상: ${targets.length.toLocaleString()}개\n`);
  if (!targets.length) { console.log('✅ 처리할 단지 없음'); return; }

  let done = 0, withExisting = 0, estimated = 0, noData = 0, fail = 0;
  const now = new Date().toISOString();

  for (const c of targets) {
    if (testMode) console.log(`\n── ${c.name} (${c.kapt_code}) molit_key=${c.molit_key}`);

    if (!c.molit_key) { noData++; done++; continue; }

    const [lawdCd, aptName] = c.molit_key.split('|');

    // 1단계: 실거래 면적
    const tradesAreas = await fetchTradesAreas(lawdCd, aptName);

    if (!tradesAreas.length) {
      if (testMode) console.log('  → apt_trades 데이터 없음');
      noData++; done++;
      if (done % 200 === 0) await sleep(500);
      continue;
    }

    // 2단계: 기존 unit_types supply_area 매칭
    const unitTypes = matchSupplyArea(tradesAreas, c.unit_types);

    if (testMode) {
      console.log(`  trades: ${tradesAreas.length}개, 기존: ${c.unit_types?.length ?? 0}개`);
      console.log('  result:', JSON.stringify(unitTypes, null, 2));
    }

    const { error: dbErr } = await supabase
      .from('apartment_complexes')
      .update({ unit_types: unitTypes, updated_at: now })
      .eq('kapt_code', c.kapt_code);

    if (dbErr) {
      console.error(`\n⚠️  DB 오류 [${c.name}]: ${dbErr.message}`);
      fail++;
    } else {
      const hasExisting = unitTypes.some(u => u.source?.includes('+'));
      if (hasExisting) withExisting++; else estimated++;
    }

    done++;
    process.stdout.write(
      `\r  진행: ${done}/${targets.length} | 기존데이터매칭: ${withExisting} | 추정: ${estimated} | 없음: ${noData} | 실패: ${fail}   `
    );
    if (done % 200 === 0) await sleep(500);
  }

  console.log(`\n\n🎉 완료!`);
  console.log(`   기존 데이터 매칭: ${withExisting.toLocaleString()}`);
  console.log(`   추정(×1.3): ${estimated.toLocaleString()}`);
  console.log(`   데이터 없음: ${noData.toLocaleString()}`);
  console.log(`   실패: ${fail.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
