/**
 * 단지 실거래가 보강 스크립트 (apt_trades DB 기반)
 *
 * apt_trades 테이블에서 최근 6개월 매매 건별 데이터를 읽어
 * 단지별 대표 평형(most-traded) + 평균 실거래가를 계산하고
 * apartment_complexes.avg_pyeong / avg_price 를 업데이트한다.
 *
 * MOLIT API를 직접 호출하지 않으므로 빠르고 API 쿼터를 소모하지 않는다.
 *
 * 실행: node scripts/enrich-prices.mjs
 * 옵션: --force (이미 보강된 단지도 재계산)
 * 필수 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config }       from 'dotenv';
import { resolve }      from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('❌ 환경변수 없음: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db    = createClient(SB_URL, SB_KEY);
const force = process.argv.includes('--force');
const MONTHS      = 12; // 1차: 최근 12개월
const MONTHS_LONG = 24; // 폴백: 최근 24개월 (12개월 거래 없는 단지용)

// ── 최근 N개월 YYYYMM 목록 ────────────────────────────────────────────────────
function recentYMs(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// ── 이름 정규화: 공백 제거 + 소문자 + 영문 브랜드 → 한글 ────────────────────
const BRAND_NORM = [
  [/^lg/i,       '엘지'],
  [/^gs/i,       '지에스'],
  [/^sk/i,       '에스케이'],
  [/^kcc/i,      '케이씨씨'],
  [/^hdc/i,      '에이치디씨'],
  [/^dl/i,       '디엘'],
  [/^e편한세상/,  '이편한세상'],
  [/^eg/i,       '이지'],
];

function normName(s) {
  let n = (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  for (const [pat, rep] of BRAND_NORM) n = n.replace(pat, rep);
  return n;
}

function matchName(tradeName, complexName) {
  const a = normName(tradeName);
  const b = normName(complexName);
  return a === b || a.includes(b) || b.includes(a);
}

// ── 대표 평형 + 평균가 계산 ───────────────────────────────────────────────────
function calcStats(trades) {
  if (!trades.length) return null;

  const byPyeong = new Map();
  for (const t of trades) {
    const pyeong = Math.round((t.exclusive_area ?? 0) / 3.3058);
    if (!byPyeong.has(pyeong)) byPyeong.set(pyeong, []);
    byPyeong.get(pyeong).push(t.price);
  }

  let maxCount = 0, modePyeong = 0;
  for (const [pyeong, prices] of byPyeong) {
    if (prices.length > maxCount) { maxCount = prices.length; modePyeong = pyeong; }
  }

  const prices   = byPyeong.get(modePyeong);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  // 대표 평형의 대표 전용면적(최빈) — 마커 ㎡ 표기용 (평 역산은 오차 커서 실측 사용)
  const areaFreq = new Map();
  for (const t of trades) {
    if (Math.round((t.exclusive_area ?? 0) / 3.3058) !== modePyeong) continue;
    const a = Math.round((t.exclusive_area ?? 0) * 100) / 100;
    areaFreq.set(a, (areaFreq.get(a) ?? 0) + 1);
  }
  let avgArea = null, maxAF = 0;
  for (const [a, f] of areaFreq) if (f > maxAF) { maxAF = f; avgArea = a; }

  const byYear = new Map();
  for (const t of trades) {
    if (t.build_year > 1900) byYear.set(t.build_year, (byYear.get(t.build_year) ?? 0) + 1);
  }
  const built_year = byYear.size > 0
    ? [...byYear.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return { avg_pyeong: modePyeong, avg_area: avgArea, avg_price: avgPrice, built_year };
}

// ── LAWD 코드 맵 로드 ─────────────────────────────────────────────────────────
const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');

function getLawdCode(sido, sigungu) {
  const list = LAWD_CODE_MAP[sido] ?? [];
  const norm = s => s.replace(/\s+/g, '');
  const ns = norm(sigungu);
  return (list.find(d => norm(d.name) === ns) ?? list.find(d => { const nd = norm(d.name); return ns.includes(nd) || nd.includes(ns); }))?.code ?? null;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  const yms      = recentYMs(MONTHS);
  const fromYm   = yms[yms.length - 1];
  const ymsLong  = recentYMs(MONTHS_LONG);
  const fromYmL  = ymsLong[ymsLong.length - 1];
  console.log(`💰 단지 실거래가 보강 시작 (apt_trades 기반, 최근 ${MONTHS}개월: ${fromYm}~ / 폴백 ${MONTHS_LONG}개월: ${fromYmL}~)`);
  console.log(`   모드: ${force ? '전체 재계산' : '미보강 단지만'}\n`);

  // 1. 보강 대상 단지 로드
  let query = db.from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu, molit_key')
    .not('sido', 'is', null)
    .not('sigungu', 'is', null);
  if (!force) query = query.is('avg_price', null);

  const complexes = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.order('kapt_code').range(from, from + 999);
    if (error || !data?.length) break;
    complexes.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`📍 보강 대상: ${complexes.length.toLocaleString()}개\n`);
  if (!complexes.length) { console.log('✅ 보강할 단지 없음'); return; }

  // 2. lawd_cd별 그룹핑
  const groups = new Map();
  for (const c of complexes) {
    const code = getLawdCode(c.sido, c.sigungu);
    if (!code) continue;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(c);
  }
  console.log(`🗺️  시군구 수: ${groups.size}개\n`);

  let enriched = 0, skipped = 0, groupDone = 0;
  const updates = [];
  const totalGroups = groups.size;

  // 3. 시군구별 apt_trades 조회 + 매칭
  for (const [lawdCd, group] of groups) {
    process.stdout.write(`\r  [${++groupDone}/${totalGroups}] lawd_cd=${lawdCd} (${group.length}개 단지)`.padEnd(60));

    // apt_trades에서 이 시군구 최근 24개월 매매 전체 로드 (12개월 + 폴백용)
    // Supabase 1회 응답은 최대 1000행 — 대형 시군구는 수만 건이므로 페이징 필수
    const trades = [];
    let tFrom = 0;
    while (true) {
      const { data, error } = await db
        .from('apt_trades')
        .select('apt_name, exclusive_area, price, build_year, deal_ym, deal_type')
        .eq('lawd_cd', lawdCd)
        .in('deal_type', ['T', 'N']) // N = 분양권/입주권 (매매 없는 신축 단지 폴백용)
        .gte('deal_ym', fromYmL)
        .not('price', 'is', null)
        .order('deal_ym')
        .range(tFrom, tFrom + 999);
      if (error) { console.error(`\n⚠️  ${lawdCd}:`, error.message); break; }
      if (!data?.length) break;
      trades.push(...data);
      if (data.length < 1000) break;
      tFrom += 1000;
    }

    if (!trades.length) { skipped += group.length; continue; }

    const trades12 = trades.filter(t => t.deal_ym >= fromYm);

    // 단지별 매칭 + 통계 (12개월 우선, 없으면 24개월 폴백)
    // molit_key 정확 매칭 우선 — 개명 단지(표시명 ≠ MOLIT 신고명)도 보강 가능
    for (const c of group) {
      const exactName = c.molit_key?.split('|')[1];
      let matched12 = exactName ? trades12.filter(t => t.apt_name === exactName) : [];
      let matched24 = matched12.length ? matched12
        : exactName ? trades.filter(t => t.apt_name === exactName) : [];
      if (!matched24.length) {
        matched12 = trades12.filter(t => matchName(t.apt_name, c.name));
        matched24 = matched12.length ? matched12 : trades.filter(t => matchName(t.apt_name, c.name));
      }
      // 매매(T) 우선, 매매가 없으면 분양권/입주권(N)으로 폴백
      const tOnly     = matched24.filter(t => t.deal_type === 'T');
      const stats     = calcStats(tOnly.length ? tOnly : matched24);
      if (stats) { updates.push({ kapt_code: c.kapt_code, ...stats }); enriched++; }
      else skipped++;
    }

    // 100건마다 배치 upsert
    if (updates.length >= 100) await flush(updates.splice(0, updates.length));
  }

  if (updates.length) await flush(updates);
  console.log(`\n\n🎉 완료! 보강: ${enriched.toLocaleString()}개 | 스킵: ${skipped.toLocaleString()}개`);
}

async function flush(batch) {
  const now = new Date().toISOString();
  await Promise.all(batch.map(({ kapt_code, avg_pyeong, avg_area, avg_price, built_year }) => {
    const payload = { avg_pyeong, avg_price, updated_at: now };
    if (avg_area != null) payload.avg_area = avg_area;
    if (built_year) payload.built_year = built_year;
    return db.from('apartment_complexes').update(payload).eq('kapt_code', kapt_code)
      .then(({ error }) => { if (error) console.error(`\n⚠️  ${kapt_code}:`, error.message); });
  }));
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
