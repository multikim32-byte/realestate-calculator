/**
 * MOLIT 단지명 기준 마이그레이션
 *
 * 단지집사의 단지명/molit_key를 MOLIT 실거래 기준으로 통일한다.
 *
 * Phase 1: A-prefix + molit_key 있는 단지 → 이름을 MOLIT apt_name으로 업데이트
 * Phase 2: A-prefix + molit_key 없는 단지 → kapt_addr 지번으로 apt_trades 매칭
 * Phase 3: 중복된 M-prefix (같은 molit_key가 A-prefix에도 있는 것) → deprecated 처리
 *
 * 실행: node scripts/migrate-to-molit-names.mjs
 * 옵션:
 *   --dry-run   DB 저장 없이 결과만 출력
 *   --phase=1   특정 단계만 실행 (1, 2, 3)
 *   --limit=N   처리 건수 제한 (테스트용)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const phaseArg = args.find(a => a.startsWith('--phase='))?.replace('--phase=', '');
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.replace('--limit=', '') ?? '0');

const runPhase = (n) => !phaseArg || phaseArg === String(n);

// ── 이름 정규화 (build-molit-complexes.mjs와 동일) ───────────────────────────
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

// ── kapt_addr에서 지번 추출 ───────────────────────────────────────────────────
// 예: "경상남도 창원성산구 대원동 80 대원대동2차" → { dong: "대원동", jibun: "80" }
// 예: "서울특별시 강남구 개포동 660-1 단지명" → { dong: "개포동", jibun: "660-1" }
function parseKaptAddr(kapt_addr) {
  if (!kapt_addr) return null;
  // 패턴: [시도] [시군구] [읍면동] [지번] [단지명...]
  // 지번: 숫자(-숫자)? 형태
  const m = kapt_addr.match(/([가-힣]+(?:동|읍|면|리))\s+([\d]+-?[\d]*)/);
  if (!m) return null;
  return { dong: m[1], jibun: m[2] };
}

// ── Phase 1: molit_key 있는 A-prefix → 이름 업데이트 ─────────────────────────
async function phase1() {
  console.log('\n━━━ Phase 1: A-prefix 이름 MOLIT 기준으로 업데이트 ━━━\n');

  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, slug')
      .like('kapt_code', 'A%')
      .not('molit_key', 'is', null)
      .order('kapt_code')
      .range(from, from + 999);
    if (error || !data?.length) break;
    rows.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`대상: ${rows.length.toLocaleString()}개`);

  const toUpdate = [];
  for (const r of rows) {
    const molitName = r.molit_key.split('|')[1];
    if (!molitName || r.name === molitName) continue;
    toUpdate.push({ kapt_code: r.kapt_code, oldName: r.name, newName: molitName });
  }
  console.log(`이름 불일치 (업데이트 필요): ${toUpdate.length.toLocaleString()}개`);

  const list = limitArg ? toUpdate.slice(0, limitArg) : toUpdate;

  let done = 0;
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100);
    if (!dryRun) {
      for (const u of batch) {
        await sb.from('apartment_complexes')
          .update({ name: u.newName })
          .eq('kapt_code', u.kapt_code);
      }
    }
    done += batch.length;
    process.stdout.write(`\r  업데이트: ${done}/${list.length}`);
  }

  console.log(`\n✅ Phase 1 완료: ${list.length}개 이름 변경${dryRun ? ' (DRY-RUN)' : ''}`);
  if (dryRun && list.length > 0) {
    console.log('  샘플:', list.slice(0, 5).map(u => `"${u.oldName}" → "${u.newName}"`).join('\n         '));
  }
  return list.length;
}

// ── Phase 2: molit_key 없는 A-prefix → lat/lng 근접 + 이름 유사도 매칭 ─────────
// 이전 jibun 매칭 방식은 K-apt와 MOLIT의 지번 체계 불일치로 효과 없었음.
// 대신: A-prefix의 lat/lng 기준 150m 이내 M-prefix 중 이름이 가장 유사한 것을 매칭.

// 위도 1도 ≈ 111km, 경도 1도 ≈ 88km (한국 기준)
const LAT_DEG_PER_M = 1 / 111000;
const LNG_DEG_PER_M = 1 / 88000;
const RADIUS_M        = 150; // 다수 후보 시 매칭 반경
const RADIUS_SINGLE_M = 500; // 단일 후보 시 매칭 반경 (이름이 달라도 허용)

function distanceM(lat1, lng1, lat2, lng2) {
  const dlat = (lat1 - lat2) / LAT_DEG_PER_M;
  const dlng = (lng1 - lng2) / LNG_DEG_PER_M;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// 이름 유사도: 정규화 후 공통 문자 비율
function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  // 공통 앞4글자
  if (na.length >= 4 && nb.length >= 4 && na.slice(0, 4) === nb.slice(0, 4)) return 0.8;
  // bigram overlap
  const bigrams = s => new Set(Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2)));
  const ba = bigrams(na), bb = bigrams(nb);
  if (!ba.size || !bb.size) return 0;
  const inter = [...ba].filter(b => bb.has(b)).length;
  return (2 * inter) / (ba.size + bb.size);
}

async function phase2() {
  console.log('\n━━━ Phase 2: lat/lng 근접(150m) + 이름 유사도 molit_key 매칭 ━━━\n');

  // ── A-prefix: molit_key 없음 + lat/lng 있음 ─────────────────────────────────
  const aRows = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('kapt_code, name, sigungu, lat, lng')
      .like('kapt_code', 'A%')
      .is('molit_key', null)
      .not('lat', 'is', null)
      .range(from, from + 999);
    if (!data?.length) break;
    aRows.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`A-prefix 대상: ${aRows.length.toLocaleString()}개`);

  // ── M-prefix: molit_key + lat/lng 있음 → 시군구별 인덱스 ────────────────────
  console.log('M-prefix 인덱스 구축 중...');
  const mRows = [];
  from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, sigungu, lat, lng')
      .like('kapt_code', 'M%')
      .not('molit_key', 'is', null)
      .not('lat', 'is', null)
      .neq('source', 'kapt_deprecated')
      .range(from, from + 999);
    if (!data?.length) break;
    mRows.push(...data);
    from += 1000;
    if (data.length < 1000) break;
  }

  // 시군구별 그룹화 (공백 제거 정규화: "안양 만안구" == "안양만안구")
  const normSgg = s => (s ?? '').replace(/\s+/g, '');
  const mBySigungu = new Map();
  for (const m of mRows) {
    const key = normSgg(m.sigungu);
    if (!mBySigungu.has(key)) mBySigungu.set(key, []);
    mBySigungu.get(key).push(m);
  }
  console.log(`M-prefix: ${mRows.length.toLocaleString()}개, ${mBySigungu.size}개 시군구\n`);

  const list = limitArg ? aRows.slice(0, limitArg) : aRows;
  let matched = 0, ambiguous = 0, noNearby = 0;
  const updates = [];

  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const candidates = mBySigungu.get(normSgg(a.sigungu)) ?? [];

    // 500m 이내 전체 후보 (단일 여부 판단용)
    const allNearby = candidates
      .map(m => ({ ...m, dist: distanceM(a.lat, a.lng, m.lat, m.lng) }))
      .filter(m => m.dist <= RADIUS_SINGLE_M)
      .sort((x, y) => x.dist - y.dist);

    if (!allNearby.length) { noNearby++; continue; }

    let best;
    if (allNearby.length === 1) {
      // 500m 이내 단일 후보 → 근접 매칭
      // 단, sim<0.2이고 100m 초과면 명백한 오매칭(차수분리, 다른 단지)이므로 스킵
      const sim = nameSimilarity(a.name, allNearby[0].name);
      if (sim < 0.2 && allNearby[0].dist > 100) { noNearby++; continue; }
      best = { ...allNearby[0], sim };
    } else {
      // 다수 후보 → 150m 이내로 좁히고 이름 유사도 매칭
      const nearby = allNearby.filter(m => m.dist <= RADIUS_M);
      if (!nearby.length) { noNearby++; continue; }
      const scored = nearby.map(m => ({ ...m, sim: nameSimilarity(a.name, m.name) }))
                           .sort((x, y) => y.sim - x.sim);
      if (scored[0].sim < 0.3) { noNearby++; continue; }
      if (scored[1] && scored[0].sim - scored[1].sim < 0.15) { ambiguous++; continue; }
      best = scored[0];
    }

    const nameChanged = a.name !== best.name;
    updates.push({
      kapt_code:  a.kapt_code,
      molit_key:  best.molit_key,
      newName:    best.name,
      nameChanged,
      oldName:    a.name,
      dist:       Math.round(best.dist),
      sim:        best.sim.toFixed(2),
    });
    matched++;

    if ((i + 1) % 200 === 0) {
      process.stdout.write(`\r  진행: ${i+1}/${list.length} | 매칭: ${matched} | 근처없음: ${noNearby} | 모호: ${ambiguous}`);
    }
  }
  console.log(`\r  진행: ${list.length}/${list.length} | 매칭: ${matched} | 근처없음: ${noNearby} | 모호: ${ambiguous}`);

  if (dryRun && updates.length > 0) {
    console.log('\nDRY-RUN 샘플 (거리·유사도 포함):');
    updates.slice(0, 10).forEach(u =>
      console.log(`  [${u.dist}m, sim=${u.sim}] "${u.oldName}" → molit_key=${u.molit_key}${u.nameChanged ? ` / 이름:"${u.newName}"` : ''}`)
    );
  }

  if (!dryRun && updates.length) {
    console.log(`\nDB 업데이트 중... (${updates.length}개)`);
    let saved = 0, deprecated = 0;
    for (const u of updates) {
      // molit_key가 M-prefix에 이미 있으면 먼저 deprecated 처리 (unique constraint 해소)
      const { data: clash } = await sb.from('apartment_complexes')
        .select('kapt_code')
        .eq('molit_key', u.molit_key)
        .like('kapt_code', 'M%')
        .neq('source', 'kapt_deprecated')
        .maybeSingle();
      if (clash) {
        await sb.from('apartment_complexes')
          .update({ source: 'kapt_deprecated', molit_key: null })
          .eq('kapt_code', clash.kapt_code);
        deprecated++;
      }
      const upd = { molit_key: u.molit_key };
      if (u.nameChanged) upd.name = u.newName;
      const { error } = await sb.from('apartment_complexes').update(upd).eq('kapt_code', u.kapt_code);
      if (!error) saved++;
      else console.error(`\n⚠️  ${u.kapt_code}:`, error.message);
    }
    console.log(`✅ ${saved}개 업데이트, M-prefix deprecated: ${deprecated}개`);
  }

  console.log(`✅ Phase 2 완료: ${matched}개 매칭${dryRun ? ' (DRY-RUN)' : ''}`);
  return matched;
}

// ── Phase 3: M-prefix 중복 제거 ──────────────────────────────────────────────
async function phase3() {
  console.log('\n━━━ Phase 3: M-prefix 중복 deprecated 처리 ━━━\n');

  // A-prefix의 모든 molit_key 수집
  const aMolits = new Set();
  let from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('molit_key')
      .like('kapt_code', 'A%')
      .not('molit_key', 'is', null)
      .range(from, from + 999);
    if (!data?.length) break;
    data.forEach(r => aMolits.add(r.molit_key));
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`A-prefix molit_key: ${aMolits.size.toLocaleString()}개`);

  // M-prefix 중 molit_key가 A-prefix에도 있는 것
  const mRows = [];
  from = 0;
  while (true) {
    const { data } = await sb.from('apartment_complexes')
      .select('kapt_code, name, molit_key, source')
      .like('kapt_code', 'M%')
      .not('molit_key', 'is', null)
      .neq('source', 'kapt_deprecated')
      .range(from, from + 999);
    if (!data?.length) break;
    mRows.push(...data.filter(r => aMolits.has(r.molit_key)));
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`M-prefix 중복 (deprecated 처리 대상): ${mRows.length.toLocaleString()}개`);

  if (!dryRun && mRows.length) {
    const codes = mRows.map(r => r.kapt_code);
    for (let i = 0; i < codes.length; i += 200) {
      const batch = codes.slice(i, i + 200);
      await sb.from('apartment_complexes')
        .update({ source: 'kapt_deprecated' })
        .in('kapt_code', batch);
      process.stdout.write(`\r  deprecated: ${Math.min(i+200, codes.length)}/${codes.length}`);
    }
    console.log('\n');
  } else if (dryRun) {
    console.log('DRY-RUN 샘플:', mRows.slice(0, 5).map(r => r.name).join(', '));
  }

  console.log(`✅ Phase 3 완료: ${mRows.length}개 deprecated${dryRun ? ' (DRY-RUN)' : ''}`);
  return mRows.length;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 MOLIT 단지명 기준 마이그레이션');
  console.log(`   모드: ${dryRun ? 'DRY-RUN (DB 저장 안 함)' : '실제 저장'}`);
  if (phaseArg) console.log(`   단계: Phase ${phaseArg}만 실행`);
  if (limitArg) console.log(`   제한: ${limitArg}건`);

  let p1 = 0, p2 = 0, p3 = 0;
  if (runPhase(1)) p1 = await phase1();
  if (runPhase(2)) p2 = await phase2();
  if (runPhase(3)) p3 = await phase3();

  console.log('\n🎉 전체 완료!');
  console.log(`   Phase 1 (이름 업데이트): ${p1.toLocaleString()}개`);
  console.log(`   Phase 2 (jibun 매칭): ${p2.toLocaleString()}개`);
  console.log(`   Phase 3 (M-prefix 중복 제거): ${p3.toLocaleString()}개`);
  console.log('\n   다음 단계: node scripts/enrich-prices.mjs --force  (avg_price 재계산)');
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
