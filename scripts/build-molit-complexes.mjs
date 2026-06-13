/**
 * MOLIT 실거래가 기반 단지 목록 구축
 *
 * apt_trades(jibun 포함)에서 DISTINCT 단지를 추출해
 * 카카오 Geocoding으로 좌표를 확보한 뒤
 * apartment_complexes 를 갱신한다.
 *
 * 동작:
 *  1) K-apt 기존 단지 → molit_key 매칭 업데이트 (lat/lng null 이면 보강)
 *  2) MOLIT에만 있는 신규 단지 → INSERT (source='molit')
 *
 * 실행:
 *   node scripts/build-molit-complexes.mjs            # 전체
 *   node scripts/build-molit-complexes.mjs --sido=부산 # 특정 시도
 *   node scripts/build-molit-complexes.mjs --dry-run   # DB 저장 없이 확인
 */

import { createClient }  from '@supabase/supabase-js';
import { createHash }    from 'node:crypto';
import { config }        from 'dotenv';
import { resolve }       from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_KEY   = process.env.KAKAO_REST_API_KEY;

if (!SB_URL || !SB_KEY || !KAKAO_KEY) {
  console.error('❌ 필수 환경변수 없음: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAKAO_REST_API_KEY');
  process.exit(1);
}

const db     = createClient(SB_URL, SB_KEY);
const args   = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.includes('=')).map(a => a.replace('--','').split('=')));
const dryRun     = args.includes('--dry-run');
const filterSido = argMap['sido'];

const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');

// ── slug 생성 ─────────────────────────────────────────────────────────────────
const SIDO_MAP = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
  '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
  '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기',
  '강원특별자치도': '강원', '강원도': '강원', '충청북도': '충북',
  '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
  '전라남도': '전남', '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주',
};
function makeSlug(sido, sigungu, name) {
  const sidoAbbr = SIDO_MAP[sido] ?? sido.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
  const norm = (s) => (s ?? '').replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
  return `${norm(sidoAbbr)}-${norm(sigungu)}-${norm(name)}`;
}

// ── 이름 정규화 ───────────────────────────────────────────────────────────────
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
function matchName(a, b) {
  const na = normName(a), nb = normName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

// ── molit_key 생성 ────────────────────────────────────────────────────────────
function molitKey(lawdCd, aptName) {
  return `${lawdCd}|${aptName}`;
}

// ── 합성 kapt_code (MOLIT 전용) ───────────────────────────────────────────────
function molitKaptCode(lawdCd, aptName) {
  const h = createHash('md5').update(lawdCd + '|' + aptName).digest('hex').slice(0, 8);
  return 'M' + h.toUpperCase();
}

// ── lawd_cd → sido/sigungu 역 매핑 ────────────────────────────────────────────
const lawdToInfo = new Map();
for (const [sido, list] of Object.entries(LAWD_CODE_MAP)) {
  for (const { code, name } of list) {
    lawdToInfo.set(code, { sido, sigungu: name });
  }
}

// ── 카카오 Geocoding (지번 주소) ──────────────────────────────────────────────
const geoCache = new Map();
async function geocode(sido, sigungu, dong, jibun) {
  const query = `${sido} ${sigungu} ${dong} ${jibun}`.trim();
  if (geoCache.has(query)) return geoCache.get(query);
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&analyze_type=similar`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const doc = json.documents?.[0];
    if (doc) {
      const result = { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
      geoCache.set(query, result);
      return result;
    }
  } catch { /* geocoding 실패 시 null 반환 */ }
  geoCache.set(query, null);
  return null;
}

// ── 카카오 키워드 검색: 현재 단지명 확인 (개명/리브랜딩 자동 감지) ────────────
// MOLIT 신고명은 분양 당시 이름으로 고정되지만 카카오는 변경된 이름을 반영함
// (예: "양주 덕정역 한라비발디 퍼스티어" → "양주덕정역에피트아파트 (2027년06월예정)")
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r) * Math.cos(lat2*d2r) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function cleanPlaceName(s) {
  return (s ?? '')
    .replace(/\([^)]*\)\s*$/, '')  // 끝 괄호 제거: "(2027년06월예정)" 등
    .replace(/아파트$/, '')
    .trim();
}

// 이름 유사도 (bigram) — 0.3 미만이면 진짜 개명(리브랜딩), 이상이면 표기 변형(MOLIT 이름 유지)
function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb || na.includes(nb) || nb.includes(na)) return 1;
  const bg = s => { const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r; };
  const ba = bg(na), bb = bg(nb);
  if (!ba.size || !bb.size) return 0;
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}
// 노이즈 제외: 상가/부속건물, 지번 괄호, 차수 합본(쉼표)
function isJunkName(n) { return n.includes('상가') || /\(\d/.test(n) || n.includes(','); }

async function kakaoCurrentName(sigungu, aptName, lat, lng) {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sigungu} ${aptName}`)}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const doc = json.documents?.find(d => d.category_name?.includes('아파트'));
    if (!doc) return null;
    // 지번 좌표와 300m 이내일 때만 신뢰 (다른 단지 오매칭 방지)
    if (haversineM(lat, lng, parseFloat(doc.y), parseFloat(doc.x)) > 300) return null;
    return cleanPlaceName(doc.place_name) || null;
  } catch { return null; }
}

// ── MOLIT 단지 목록 추출 (apt_trades에서 DISTINCT) ────────────────────────────
async function fetchMolitComplexes() {
  const map = new Map(); // key: lawd_cd|apt_name → { lawd_cd, apt_name, dong, jibun, tradeCnt, buildYears }

  process.stdout.write('apt_trades에서 단지 목록 추출 중...');
  for (const dealType of ['T', 'N']) {
    // keyset 페이징 (id 기준) — 정렬 없는 offset 페이징은 스캔 중 동시 INSERT 시
    // 페이지 경계가 밀려 행을 건너뜀 (청송군 단지 누락 사례). offset+order는 깊어질수록 느려서 keyset 사용
    let lastId = 0;
    while (true) {
      const { data, error } = await db
        .from('apt_trades')
        .select('id, lawd_cd, apt_name, dong, jibun, build_year, deal_type')
        .eq('deal_type', dealType)
        .not('jibun', 'is', null)
        .gt('id', lastId)
        .order('id')
        .limit(1000);

      if (error || !data?.length) break;
      lastId = data[data.length - 1].id;

      for (const r of data) {
        const k = molitKey(r.lawd_cd, r.apt_name);
        if (!map.has(k)) {
          map.set(k, { lawd_cd: r.lawd_cd, apt_name: r.apt_name, dong: r.dong, jibun: r.jibun, tradeCnt: 0, buildYears: [], isPresale: r.deal_type === 'N' });
        }
        const entry = map.get(k);
        entry.tradeCnt++;
        if (r.jibun && !entry.jibun) entry.jibun = r.jibun;
        if (r.build_year > 1900) entry.buildYears.push(r.build_year);
        // T 타입이 하나라도 있으면 분양권 전용 아님
        if (r.deal_type === 'T') entry.isPresale = false;
      }

      if (data.length < 1000) break;
      process.stdout.write('.');
    }
  }
  console.log(` ${map.size.toLocaleString()}개`);
  return [...map.values()];
}

// ── K-apt 기존 단지 로드 ──────────────────────────────────────────────────────
async function fetchKaptComplexes() {
  const list = [];
  let from = 0;
  while (true) {
    const { data } = await db.from('apartment_complexes')
      .select('kapt_code, name, sido, sigungu, dong, lat, lng, molit_key')
      .not('sido', 'is', null).range(from, from + 999);
    if (!data?.length) break;
    list.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return list;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🏗️  MOLIT 기반 단지 구축 시작 (${dryRun ? 'DRY-RUN' : '실제 저장'})\n`);

  const molitList = await fetchMolitComplexes();
  // sido 필터
  const filtered = filterSido
    ? molitList.filter(c => {
        const info = lawdToInfo.get(c.lawd_cd);
        return info?.sido === filterSido || info?.sido.includes(filterSido);
      })
    : molitList;

  console.log(`📍 처리 대상: ${filtered.length.toLocaleString()}개 (거래 기록 있음)\n`);

  // K-apt 전체 로드 + normName 맵
  const kapts = await fetchKaptComplexes();
  console.log(`🗃️  K-apt 단지: ${kapts.length.toLocaleString()}개\n`);

  // K-apt를 (sido+sigungu+normName)으로 인덱싱
  const kaptIndex = new Map(); // sido|sigungu|normName → kapt entry
  for (const k of kapts) {
    const key = `${k.sido}|${k.sigungu}|${normName(k.name)}`;
    if (!kaptIndex.has(key)) kaptIndex.set(key, k);
  }

  let matched = 0, inserted = 0, geocodeFail = 0;
  const updateQueue = []; // K-apt 업데이트 배치
  const insertQueue = []; // MOLIT 신규 단지 배치

  for (let i = 0; i < filtered.length; i++) {
    const c = filtered[i];
    const info = lawdToInfo.get(c.lawd_cd);
    if (!info) continue;

    if (filterSido && !info.sido.includes(filterSido)) continue;

    const { sido, sigungu } = info;
    const normApt = normName(c.apt_name);

    // K-apt 매칭 시도
    const kaptKey = `${sido}|${sigungu}|${normApt}`;
    const kaptEntry = kaptIndex.get(kaptKey)
      ?? [...kaptIndex.entries()]
          .find(([k]) => k.startsWith(`${sido}|${sigungu}|`) && matchName(k.split('|')[2], normApt))?.[1];

    if (kaptEntry) {
      // K-apt 매칭됨 → molit_key 업데이트 + lat/lng 보강
      const update = { molit_key: molitKey(c.lawd_cd, c.apt_name), source: 'kapt' };
      if (!kaptEntry.lat && c.jibun) {
        const geo = await geocode(sido, sigungu, c.dong, c.jibun);
        if (geo) { update.lat = geo.lat; update.lng = geo.lng; }
        await sleep(30);
      }
      updateQueue.push({ kapt_code: kaptEntry.kapt_code, ...update });
      matched++;
    } else {
      // MOLIT 전용 신규 단지 → 좌표 확보 후 INSERT
      let lat = null, lng = null;
      if (c.jibun) {
        const geo = await geocode(sido, sigungu, c.dong, c.jibun);
        if (geo) { lat = geo.lat; lng = geo.lng; }
        else geocodeFail++;
        await sleep(30);
      }

      const builtYear = c.buildYears.length
        ? Math.round(c.buildYears.reduce((a,b)=>a+b,0) / c.buildYears.length)
        : null;

      // 개명/리브랜딩 감지: 카카오 장소명이 신고명과 전혀 다르면 카카오 이름 채택
      // (molit_key는 신고명 유지 — 실거래 매칭용)
      let displayName = c.apt_name;
      if (lat != null) {
        const kakaoName = await kakaoCurrentName(sigungu, c.apt_name, lat, lng);
        if (kakaoName && nameSimilarity(kakaoName, c.apt_name) < 0.3 && !isJunkName(kakaoName)) {
          displayName = kakaoName;
          console.log(`\n  📛 개명 감지: ${c.apt_name} → ${displayName}`);
        }
        await sleep(30);
      }

      const kaptCode = molitKaptCode(c.lawd_cd, c.apt_name);
      insertQueue.push({
        kapt_code:  kaptCode,
        molit_key:  molitKey(c.lawd_cd, c.apt_name),
        name:       displayName,
        slug:       `${makeSlug(sido, sigungu, displayName)}-${kaptCode.toLowerCase()}`,
        source:     'molit',
        sido, sigungu,
        dong:       c.dong,
        lat, lng,
        built_year: builtYear,
      });
      inserted++;
    }

    if ((i + 1) % 100 === 0 || i + 1 === filtered.length) {
      process.stdout.write(`\r  처리: ${i+1}/${filtered.length} | 매칭: ${matched} | 신규: ${inserted} | 좌표실패: ${geocodeFail}`);
    }

    // 배치 저장 (100건마다)
    if (!dryRun) {
      if (updateQueue.length >= 100) await flushUpdates(updateQueue.splice(0, 100));
      if (insertQueue.length >= 50)  await flushInserts(insertQueue.splice(0, 50));
    }
  }

  // 잔여 저장
  if (!dryRun) {
    if (updateQueue.length) await flushUpdates(updateQueue);
    if (insertQueue.length) await flushInserts(insertQueue);
  }

  console.log(`\n\n✅ 완료!`);
  console.log(`   K-apt 매칭 업데이트: ${matched}개`);
  console.log(`   MOLIT 신규 삽입:     ${inserted}개`);
  console.log(`   좌표 확보 실패:      ${geocodeFail}개`);
}

async function flushUpdates(batch) {
  await Promise.all(batch.map(async ({ kapt_code, lat, lng, ...update }) => {
    // molit_key/source는 미설정(null)일 때만 — 기존 매칭 덮어쓰기 방지
    const { error } = await db.from('apartment_complexes')
      .update(update).eq('kapt_code', kapt_code).is('molit_key', null);
    if (error) console.error(`\n⚠️  update ${kapt_code}:`, error.message);
    // 좌표는 molit_key 유무와 무관하게 비어있으면 보강
    // (기존엔 molit_key 조건에 묶여 한 번 매칭된 단지의 좌표가 영영 안 채워졌음)
    if (lat != null) {
      const { error: e2 } = await db.from('apartment_complexes')
        .update({ lat, lng }).eq('kapt_code', kapt_code).is('lat', null);
      if (e2) console.error(`\n⚠️  coord ${kapt_code}:`, e2.message);
    }
  }));
}

async function flushInserts(batch) {
  const { error } = await db.from('apartment_complexes')
    .upsert(batch, { onConflict: 'kapt_code', ignoreDuplicates: true });
  if (error) console.error('\n⚠️  insert 오류:', error.message);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
