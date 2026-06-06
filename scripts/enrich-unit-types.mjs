/**
 * unit_types 보강 스크립트 v4 (국토부 AptBasisInfoServiceV4 기반)
 *
 * getAphusHouseInfoV4 → house_ty, supply_area, exclusive_area, count
 * → apartment_complexes.unit_types JSONB 업데이트
 *
 * 실행: node scripts/enrich-unit-types.mjs
 * 옵션:
 *   --force        기존 unit_types 덮어쓰기 (기본: null인 단지만)
 *   --test         첫 5개만 실행, 원본 응답 로그 출력
 *   --kapt=XXXXX   특정 단지 1개만 실행
 *   --limit=N      최대 N개 처리
 * 필수 env: MOLIT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const MOLIT_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MOLIT_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음 (MOLIT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase  = createClient(SB_URL, SB_KEY);
const BASE_URL  = 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV4';

const force     = process.argv.includes('--force');
const testMode  = process.argv.includes('--test');
const kaptArg   = process.argv.find(a => a.startsWith('--kapt='))?.replace('--kapt=', '');
const limitArg  = process.argv.find(a => a.startsWith('--limit='))?.replace('--limit=', '');
const LIMIT     = limitArg ? parseInt(limitArg) : (testMode ? 5 : Infinity);

// ── APT2YOU 주택형 정보 조회 ──────────────────────────────────────────────────
async function fetchHouseTypes(kaptCode) {
  try {
    const url = `${BASE_URL}/getAphusHouseInfoV4?serviceKey=${encodeURIComponent(MOLIT_KEY)}&kaptCode=${kaptCode}&_type=json&numOfRows=100`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { items: [], raw: null };

    const json = await res.json();
    const body = json?.response?.body;

    // items.item이 배열이거나 단일 객체일 수 있음
    const raw  = body?.items?.item ?? body?.item ?? null;
    const items = !raw ? []
      : Array.isArray(raw) ? raw
      : [raw];

    return { items, raw };
  } catch (e) {
    return { items: [], raw: null, error: e.message };
  }
}

// ── 응답 항목 → unit_type 객체 변환 ──────────────────────────────────────────
function parseItem(item) {
  // 필드명이 API 버전마다 다를 수 있어 여러 이름 시도
  const houseTy = (
    item.houseTy        ??   // 주택형 코드 (예: "84A", "109B")
    item.houseType      ??
    item.housingType    ??
    item.aptHouseTy     ??
    ''
  ).trim();

  const supplyArea = parseFloat(
    item.supplyAreaVer  ??
    item.splyArea       ??
    item.supplyArea     ??
    item.kaptdaSplyArea ??
    0
  ) || 0;

  const exclusiveArea = parseFloat(
    item.exclusiveAreaVer ??
    item.exclusiveArea    ??
    item.excluArea        ??
    item.kaptdaExcluArea  ??
    0
  ) || 0;

  const count = parseInt(
    item.houseCnt       ??
    item.hoCnt          ??
    item.householdCount ??
    item.kaptdaHoCnt    ??
    0
  ) || 0;

  if (exclusiveArea <= 0 || count <= 0) return null;

  const exclusivePy = Math.round(exclusiveArea / 3.3);
  const supplyPy    = supplyArea > 0 ? Math.round(supplyArea / 3.3) : Math.round(exclusiveArea * 1.3 / 3.3);
  const finalSupply = supplyArea > 0 ? Math.round(supplyArea * 100) / 100 : Math.round(exclusiveArea * 1.3 * 100) / 100;

  return {
    house_ty:         houseTy || null,
    exclusive_area:   Math.round(exclusiveArea * 100) / 100,
    supply_area:      finalSupply,
    exclusive_pyeong: exclusivePy,
    supply_pyeong:    supplyPy,
    count,
    source:           'apt2you',
  };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  unit_types 보강 시작 (AptBasisInfoServiceV4 / getAphusHouseInfoV4)');
  console.log(`   모드: ${force ? '전체 재수집' : '미보강만'} | testMode: ${testMode}\n`);

  // 대상 단지 로드
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu');

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

  let done = 0, success = 0, noData = 0, fail = 0;
  const now = new Date().toISOString();

  for (const c of targets) {
    const { items, raw, error } = await fetchHouseTypes(c.kapt_code);

    if (testMode) {
      console.log(`\n── ${c.name} (${c.kapt_code}) ──`);
      console.log('raw:', JSON.stringify(raw, null, 2));
    }

    if (error) {
      console.error(`\n⚠️  API 오류 [${c.name}]: ${error}`);
      fail++;
      done++;
      continue;
    }

    if (!items.length) {
      noData++;
      done++;
      await sleep(120);
      process.stdout.write(
        `\r  진행: ${done}/${targets.length} | 성공: ${success} | 데이터없음: ${noData} | 실패: ${fail}   `
      );
      continue;
    }

    const unitTypes = items
      .map(parseItem)
      .filter(Boolean)
      .sort((a, b) => a.exclusive_area - b.exclusive_area);

    if (testMode) {
      console.log('parsed unit_types:', JSON.stringify(unitTypes, null, 2));
    }

    if (unitTypes.length > 0) {
      const { error: dbErr } = await supabase
        .from('apartment_complexes')
        .update({ unit_types: unitTypes, updated_at: now })
        .eq('kapt_code', c.kapt_code);

      if (dbErr) {
        console.error(`\n⚠️  DB 오류 [${c.name}]: ${dbErr.message}`);
        fail++;
      } else {
        success++;
      }
    } else {
      noData++;
    }

    done++;
    process.stdout.write(
      `\r  진행: ${done}/${targets.length} | 성공: ${success} | 데이터없음: ${noData} | 실패: ${fail}   `
    );

    await sleep(150); // API rate limit
    if (done % 200 === 0) await sleep(1000);
  }

  console.log(`\n\n🎉 완료!`);
  console.log(`   성공: ${success.toLocaleString()}`);
  console.log(`   데이터없음: ${noData.toLocaleString()}`);
  console.log(`   실패: ${fail.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
