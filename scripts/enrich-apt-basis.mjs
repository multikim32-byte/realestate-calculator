/**
 * 공동주택 기본정보 보강 스크립트 (국토교통부 AptBasisInfoServiceV4)
 *
 * kapt_code로 세대수·준공년도·난방방식·시공사·주차대수·지하철 정보 수집
 *
 * 실행: node scripts/enrich-apt-basis.mjs
 * 옵션: --only=bass|dtl  (bass=기본정보, dtl=상세정보)
 *       --force          (이미 보강된 단지도 재수집)
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
  console.error('❌ 필수 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const BASE_URL = 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV4';

const arg   = process.argv.find(a => a.startsWith('--only='));
const only  = arg ? arg.replace('--only=', '') : null; // 'bass' | 'dtl' | null(둘다)
const force = process.argv.includes('--force');

// ── API 호출 ──────────────────────────────────────────────────────────────────
async function fetchBass(kaptCode) {
  try {
    const url = `${BASE_URL}/getAphusBassInfoV4?serviceKey=${encodeURIComponent(MOLIT_KEY)}&kaptCode=${kaptCode}&_type=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.response?.body?.item ?? null;
  } catch { return null; }
}

async function fetchDtl(kaptCode) {
  try {
    const url = `${BASE_URL}/getAphusDtlInfoV4?serviceKey=${encodeURIComponent(MOLIT_KEY)}&kaptCode=${kaptCode}&_type=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.response?.body?.item ?? null;
  } catch { return null; }
}

// ── 기본정보 파싱 ─────────────────────────────────────────────────────────────
function parseBass(item) {
  if (!item) return {};
  const result = {};

  // 세대수 (hoCnt 또는 kaptdaCnt)
  const units = parseInt(item.hoCnt ?? item.kaptdaCnt ?? '0');
  if (units > 0) result.total_units = units;

  // 준공년도 (kaptUsedate YYYYMMDD → YYYY)
  const dateStr = item.kaptUsedate ?? item.kaptUseDate ?? '';
  if (dateStr.length >= 4) {
    const yr = parseInt(dateStr.slice(0, 4));
    if (yr > 1950 && yr <= new Date().getFullYear()) result.built_year = yr;
  }

  // 동수
  const dongCnt = parseInt(item.kaptDongCnt ?? '0');
  if (dongCnt > 0) result.dong_count = dongCnt;

  // 난방방식 (codeHeatNm)
  if (item.codeHeatNm) result.heating_type = item.codeHeatNm.trim();

  // 시공사
  if (item.kaptBcompany) result.builder = item.kaptBcompany.trim();

  // 최고층수
  const topFloor = parseInt(item.kaptTopFloor ?? '0');
  if (topFloor > 0) result.floor_count = topFloor;

  // 관리사무소 연락처 / 팩스
  if (item.kaptTel?.trim()) result.phone = item.kaptTel.trim();
  if (item.kaptFax?.trim()) result.fax   = item.kaptFax.trim();

  // 법정동코드 + 지번주소 (건축물대장 조회용)
  if (item.bjdCode) result.bjd_code  = String(item.bjdCode);
  if (item.kaptAddr?.trim()) result.kapt_addr = item.kaptAddr.trim();

  return result;
}

// ── 상세정보 파싱 ─────────────────────────────────────────────────────────────
function parseDtl(item) {
  if (!item) return {};
  const result = {};

  // 주차대수 (지상 + 지하)
  const above = parseInt(item.kaptdPcnt ?? '0');
  const below = parseInt(item.kaptdPcntu ?? '0');
  const total = above + below;
  if (total > 0) result.parking_total = total;

  // 지하철
  const line    = item.subwayLine?.trim();
  const station = item.subwayStation?.trim();
  const walkTime = item.kaptdWtimesub?.trim();
  if (line && line !== '' && walkTime && walkTime !== '') {
    const name = station ? `${station} ${line}` : line;
    result.nearby_subway = [{ name, walk_time: walkTime, category: 'subway' }];
  }

  // CCTV
  const cctv = parseInt(item.kaptdCccnt ?? '0');
  if (cctv > 0) result.cctv_count = cctv;

  // 복리시설 / 교육시설
  if (item.welfareFacility?.trim()) result.welfare_facility = item.welfareFacility.trim();
  if (item.educationFacility?.trim()) result.education_facility = item.educationFacility.trim();

  return result;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏢 공동주택 기본정보 보강 시작');
  console.log(`   모드: ${only ?? 'bass+dtl'} | ${force ? '전체 재수집' : '미보강만'}\n`);

  // 대상 단지 조회 — phone이 없는 단지 우선 (phone 추가 이후 기준)
  let query = supabase.from('apartment_complexes').select('kapt_code, name');
  if (!force) query = query.is('phone', null);

  const complexes = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await query.order('kapt_code').range(from, from + 999);
    if (error) { console.error('조회 오류:', error.message); break; }
    if (!page?.length) break;
    complexes.push(...page);
    if (page.length < 1000) break;
    from += 1000;
  }

  console.log(`📍 보강 대상: ${complexes.length.toLocaleString()}개\n`);
  if (!complexes.length) { console.log('✅ 보강할 단지 없음'); return; }

  let done = 0, success = 0, skip = 0;
  const BATCH = 50;

  for (const c of complexes) {
    const update = {};

    if (!only || only === 'bass') {
      const bass = await fetchBass(c.kapt_code);
      Object.assign(update, parseBass(bass));
      await sleep(150);
    }

    if (!only || only === 'dtl') {
      const dtl = await fetchDtl(c.kapt_code);
      Object.assign(update, parseDtl(dtl));
      await sleep(150);
    }

    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('apartment_complexes')
        .update(update)
        .eq('kapt_code', c.kapt_code);
      if (error) console.error(`\n⚠️  ${c.name}:`, error.message);
      else success++;
    } else {
      skip++;
    }

    done++;
    process.stdout.write(
      `\r  진행: ${done}/${complexes.length} | 성공: ${success} | 스킵: ${skip} | ${c.name}`.padEnd(80).slice(0, 80)
    );

    if (done % BATCH === 0) await sleep(500);
  }

  console.log(`\n\n🎉 완료! 성공: ${success.toLocaleString()} | 스킵: ${skip.toLocaleString()}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
