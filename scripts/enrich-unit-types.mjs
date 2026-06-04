/**
 * 단지 평형별 공급/전용면적 보강 스크립트 v2
 *
 * 건축물대장 API (getBrExposPubuseAreaInfo) →
 * 전유부 면적 집계 → unit_types (JSONB) 업데이트
 *
 * 의존: apartment_complexes.bjd_code + kapt_addr (enrich-apt-basis 실행 후 채워짐)
 *
 * 실행: node scripts/enrich-unit-types.mjs
 * 옵션: --force (이미 있는 단지도 재수집)
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const API_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const force = process.argv.includes('--force');
const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo';
const encKey = encodeURIComponent(API_KEY);

// ── 지번 파싱: "전라남도 무안군 남악리 2321번지" → { platGbCd, bun, ji } ───────
function parseJibun(addr) {
  if (!addr) return null;
  const parts = addr.trim().split(/\s+/);

  let platGbCd = '0', bun = '0', ji = '0';

  // 산번지 여부 (예: "... 산 5번지")
  const sanIdx = parts.lastIndexOf('산');
  if (sanIdx !== -1 && sanIdx >= parts.length - 2) {
    platGbCd = '1';
    const raw = parts[parts.length - 1].replace('번지', '');
    [bun, ji = '0'] = raw.split('-');
    return { platGbCd, bun, ji };
  }

  // 일반 지번 (마지막 토큰이 숫자로 시작)
  const last = parts[parts.length - 1].replace('번지', '');
  if (/^\d/.test(last)) {
    [bun, ji = '0'] = last.split('-');
    return { platGbCd, bun, ji };
  }

  // 마지막 토큰이 건물명인 경우 → 마지막에서 두번째 시도
  const prev = (parts[parts.length - 2] ?? '').replace('번지', '');
  if (/^\d/.test(prev)) {
    [bun, ji = '0'] = prev.split('-');
    return { platGbCd, bun, ji };
  }

  return null;
}

// ── 건축물대장 전유공용면적 전체 페이지 수집 ────────────────────────────────────
async function fetchAllItems(sigunguCd, bjdongCd, platGbCd, bun, ji) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${BASE}?serviceKey=${encKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}`
      + `&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}&_type=json&numOfRows=10000&pageNo=${page}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const json = await res.json();
      const body = json?.response?.body;
      const data = body?.items?.item;
      if (!data) break;
      const arr = Array.isArray(data) ? data : [data];
      items.push(...arr);
      if (items.length >= (body?.totalCount ?? 0) || arr.length < 10000) break;
      page++;
      await sleep(300);
    } catch { break; }
  }
  return items;
}

// ── 전유부 항목 → unit_types 집계 ─────────────────────────────────────────────
function toUnitTypes(items) {
  // 아파트 전유부만 추출
  const excls = items.filter(it =>
    it.exposPubuseGbCdNm === '전유' &&
    (it.mainPurpsCdNm?.includes('아파트') || it.etcPurps?.includes('아파트') || it.mainPurpsCd === '02001')
  );
  if (!excls.length) return null;

  // 전용면적 기준 집계
  const map = new Map();
  for (const it of excls) {
    const excl = Math.round((parseFloat(it.area) || 0) * 100) / 100;
    if (excl < 10) continue; // 비현실적 면적 제외
    map.set(excl, (map.get(excl) ?? 0) + 1);
  }
  if (!map.size) return null;

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([excl, count]) => {
      const supply = Math.round(excl * 1.3 * 100) / 100;
      return {
        exclusive_area:   excl,
        supply_area:      supply,
        exclusive_pyeong: Math.round(excl / 3.3),
        supply_pyeong:    Math.round(supply / 3.3),
        count,
        source: 'building_registry',
      };
    });
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏗️  건축물대장 기반 평형 보강 시작');
  console.log(`   모드: ${force ? '전체 재수집' : '미보강만'}\n`);

  // bjd_code 있는 단지 로드
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, bjd_code, kapt_addr')
    .not('bjd_code', 'is', null);
  if (!force) query = query.is('unit_types', null);

  const complexes = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.order('kapt_code').range(from, from + 999);
    if (error || !data?.length) break;
    complexes.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`🏢 대상: ${complexes.length.toLocaleString()}개 (bjd_code 보유)\n`);
  if (!complexes.length) { console.log('✅ 처리할 단지 없음'); return; }

  let done = 0, matched = 0, skip = 0;

  for (const c of complexes) {
    const bjd = String(c.bjd_code ?? '').padStart(10, '0');
    if (bjd.length !== 10 || bjd === '0000000000') { skip++; done++; continue; }

    const sigunguCd = bjd.slice(0, 5);
    const bjdongCd  = bjd.slice(5, 10);
    const jibun     = parseJibun(c.kapt_addr);

    if (!jibun || jibun.bun === '0') { skip++; done++; continue; }

    const items = await fetchAllItems(sigunguCd, bjdongCd, jibun.platGbCd, jibun.bun, jibun.ji);
    await sleep(200);

    const unitTypes = toUnitTypes(items);

    if (unitTypes) {
      const { error } = await supabase
        .from('apartment_complexes')
        .update({ unit_types: unitTypes, updated_at: new Date().toISOString() })
        .eq('kapt_code', c.kapt_code);
      if (error) console.error(`\n⚠️  ${c.name}:`, error.message);
      else matched++;
    } else {
      skip++;
    }

    done++;
    process.stdout.write(
      `\r  진행: ${done.toLocaleString()}/${complexes.length.toLocaleString()} | 성공: ${matched} | 스킵: ${skip} | ${c.name}`
        .padEnd(100).slice(0, 100)
    );

    if (done % 50 === 0) await sleep(300);
  }

  console.log(`\n\n🎉 완료! 성공: ${matched.toLocaleString()} | 스킵: ${skip.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
