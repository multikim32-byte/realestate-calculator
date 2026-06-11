/**
 * M prefix 단지에 K-apt 데이터 보강
 *
 * A prefix (K-apt) 단지의 manage_cost, parking_total, total_units,
 * floor_count, dong_count, built_year, unit_types, phone, fax,
 * heating_type, welfare_facility, cctv_count, education_facility,
 * nearby_transit, nearby_schools, nearby_infra 를
 * M prefix 단지에 복사한다.
 *
 * 매칭 전략 (우선순위 순):
 *   1. molit_key 역추적: M-prefix의 molit_key와 같은 lawd_cd|apt_name을 가진 A-prefix
 *   2. road_address 완전 일치
 *   3. 좌표 근거리 (<150m) + 이름 유사도 ≥0.3
 *
 * 실행: node scripts/enrich-molit-from-kapt.mjs
 * 옵션: --force  (이미 보강된 단지도 재처리)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb    = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const force = process.argv.includes('--force');

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function normName(s) {
  return (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
}

function bigrams(s) {
  const r = new Set();
  for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i+2));
  return r;
}
function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ba = bigrams(na), bb = bigrams(nb);
  if (!ba.size || !bb.size) return 0;
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}

const COPY_FIELDS = [
  'manage_cost', 'parking_total', 'total_units', 'floor_count',
  'dong_count', 'built_year', 'unit_types', 'phone', 'fax',
  'heating_type', 'welfare_facility', 'cctv_count', 'education_facility',
  'nearby_transit', 'nearby_schools', 'nearby_infra',
];

function hasData(row) {
  const hasMc = row.manage_cost && Object.keys(row.manage_cost).length > 0;
  const hasPk = row.parking_total != null;
  const hasUt = Array.isArray(row.unit_types) && row.unit_types.length > 0;
  return hasMc || hasPk || hasUt || row.total_units != null;
}

async function loadAllPages(baseQuery) {
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

async function main() {
  console.log('🔄 M prefix K-apt 데이터 보강 시작');
  console.log(`   모드: ${force ? '전체 재처리' : '미보강만'}\n`);

  // ── 1. A prefix 로드 (데이터 있는 것) ────────────────────────────────────────
  console.log('📥 A prefix 로딩...');
  const aFields = ['kapt_code', 'name', 'molit_key', 'road_address', 'lat', 'lng', ...COPY_FIELDS].join(', ');
  const aRows = await loadAllPages(
    sb.from('apartment_complexes').select(aFields).like('kapt_code', 'A%')
  );
  const aWithData = aRows.filter(hasData);
  console.log(`   A prefix 전체: ${aRows.length.toLocaleString()}개 | 데이터 있는 것: ${aWithData.length.toLocaleString()}개\n`);

  // 인덱스 구성
  const aByMolitKey  = new Map(); // molit_key → A row
  const aByRoadAddr  = new Map(); // road_address → A row[]
  for (const a of aWithData) {
    if (a.molit_key) aByMolitKey.set(a.molit_key, a);
    if (a.road_address) {
      const addr = a.road_address.trim();
      if (!aByRoadAddr.has(addr)) aByRoadAddr.set(addr, []);
      aByRoadAddr.get(addr).push(a);
    }
  }

  // ── 2. M prefix 대상 로드 ────────────────────────────────────────────────────
  console.log('📥 M prefix 로딩...');
  let mQuery = sb.from('apartment_complexes')
    .select(`kapt_code, name, molit_key, road_address, lat, lng, total_units, manage_cost, unit_types`)
    .like('kapt_code', 'M%')
    .neq('source', 'kapt_deprecated');
  if (!force) {
    mQuery = mQuery.is('manage_cost', null);
  }
  const mRows = await loadAllPages(mQuery);
  console.log(`   M prefix 대상: ${mRows.length.toLocaleString()}개\n`);

  let byKey = 0, byAddr = 0, byGeo = 0, noMatch = 0, updated = 0;
  const BATCH = 50;

  for (let i = 0; i < mRows.length; i += BATCH) {
    const batch = mRows.slice(i, i + BATCH);
    const updates = [];

    for (const m of batch) {
      let src = null;
      let method = '';

      // ── 전략 1: molit_key 역추적 ───────────────────────────────────────────
      if (!src && m.molit_key) {
        const a = aByMolitKey.get(m.molit_key);
        if (a) { src = a; method = 'molit_key'; byKey++; }
      }

      // ── 전략 2: road_address 일치 ─────────────────────────────────────────
      if (!src && m.road_address) {
        const candidates = aByRoadAddr.get(m.road_address.trim());
        if (candidates?.length) {
          if (candidates.length === 1) {
            src = candidates[0]; method = 'road_addr'; byAddr++;
          } else if (m.total_units != null) {
            src = candidates.reduce((best, c) =>
              Math.abs((c.total_units ?? 0) - m.total_units) < Math.abs((best.total_units ?? 0) - m.total_units) ? c : best
            );
            method = 'road_addr'; byAddr++;
          } else {
            src = candidates[0]; method = 'road_addr'; byAddr++;
          }
        }
      }

      // ── 전략 3: 좌표 근거리 + 이름 유사도 ────────────────────────────────
      if (!src && m.lat && m.lng) {
        const LAT_D = 0.0014, LNG_D = 0.0018; // ~150m
        let bestSim = 0.3, bestA = null; // 최소 유사도 0.3
        for (const a of aWithData) {
          if (!a.lat || !a.lng) continue;
          if (Math.abs(a.lat - m.lat) > LAT_D || Math.abs(a.lng - m.lng) > LNG_D) continue;
          const dist = distanceM(m.lat, m.lng, a.lat, a.lng);
          if (dist > 150) continue;
          const sim = nameSimilarity(m.name, a.name);
          if (sim > bestSim) { bestSim = sim; bestA = a; }
        }
        if (bestA) { src = bestA; method = 'geo'; byGeo++; }
      }

      if (!src) { noMatch++; continue; }

      // 복사할 필드 추출
      const update = {};
      for (const f of COPY_FIELDS) {
        if (src[f] == null) continue;
        if (f === 'manage_cost' && (!src[f] || Object.keys(src[f]).length === 0)) continue;
        if (f === 'unit_types' && (!Array.isArray(src[f]) || src[f].length === 0)) continue;
        // built_year는 apt_trades 계산값이 더 정확할 수 있어서, 이미 있으면 스킵
        if (f === 'built_year' && m.built_year) continue;
        update[f] = src[f];
      }
      if (Object.keys(update).length === 0) { noMatch++; continue; }
      updates.push({ kapt_code: m.kapt_code, update });
    }

    for (const { kapt_code, update } of updates) {
      const { error } = await sb.from('apartment_complexes').update(update).eq('kapt_code', kapt_code);
      if (error) console.error(`\n⚠️  ${kapt_code}:`, error.message);
      else updated++;
    }

    process.stdout.write(
      `\r  [${Math.min(i + BATCH, mRows.length)}/${mRows.length}] 매칭: key=${byKey} addr=${byAddr} geo=${byGeo} | 미매칭: ${noMatch} | 업데이트: ${updated}`
    );
  }

  console.log('\n');
  console.log('🎉 완료!');
  console.log(`   molit_key 매칭: ${byKey}`);
  console.log(`   road_address 매칭: ${byAddr}`);
  console.log(`   좌표 근거리 매칭: ${byGeo}`);
  console.log(`   미매칭: ${noMatch}`);
  console.log(`   DB 업데이트: ${updated}`);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
