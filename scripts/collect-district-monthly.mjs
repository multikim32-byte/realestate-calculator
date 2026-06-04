/**
 * 시군구별 월별 거래량 이력 수집 스크립트
 *
 * district_trade_monthly 테이블에 2006년부터 현재까지 데이터를 채웁니다.
 * 이미 있는 (lawd_cd, deal_ym)은 건너뜁니다.
 *
 * 실행: node scripts/collect-district-monthly.mjs
 * 옵션:
 *   --from=200601  시작 년월 (기본: 200601)
 *   --to=202612    종료 년월 (기본: 현재월)
 *   --sido=서울    특정 시도만 수집
 *   --force        이미 있는 데이터도 재수집
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const MOLIT_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!MOLIT_KEY || !SB_URL || !SB_KEY) { console.error('❌ 환경변수 없음'); process.exit(1); }

const db = createClient(SB_URL, SB_KEY);
const encKey = encodeURIComponent(MOLIT_KEY);

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const RENT_URL  = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

// 옵션 파싱
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const force       = '--force' in args || args['--force'] !== undefined;
const filterSido  = args['--sido'];
const fromYm      = args['--from'] ?? '200601';
const toD         = new Date();
const toYm        = args['--to']   ?? `${toD.getFullYear()}${String(toD.getMonth()).padStart(2,'0')}`; // 전달까지

// LAWD_CODE_MAP import (동적)
const { LAWD_CODE_MAP } = await import('../lib/tradeApi.js');

// 전체 (sido, sigungu, lawdCd) 목록 구성
const allDistricts = [];
for (const [sido, list] of Object.entries(LAWD_CODE_MAP)) {
  if (filterSido && sido !== filterSido) continue;
  for (const { name, code } of list) {
    allDistricts.push({ sido, sigungu: name, lawdCd: code });
  }
}
console.log(`📍 대상 시군구: ${allDistricts.length}개 | 기간: ${fromYm} ~ ${toYm}`);

// 년월 목록 생성 (역방향 — 최신 우선)
function ymList(from, to) {
  const list = [];
  let [y, m] = [parseInt(to.slice(0,4)), parseInt(to.slice(4,6))];
  const [fy, fm] = [parseInt(from.slice(0,4)), parseInt(from.slice(4,6))];
  while (y > fy || (y === fy && m >= fm)) {
    list.push(`${y}${String(m).padStart(2,'0')}`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return list;
}
const months = ymList(fromYm, toYm);
console.log(`📅 수집 월수: ${months.length}개월\n`);

// 이미 수집된 (lawdCd, dealYm) 세트 로드
console.log('🔍 기존 데이터 확인 중...');
const existingSet = new Set();
if (!force) {
  let from = 0;
  while (true) {
    const { data, error } = await db.from('district_trade_monthly').select('lawd_cd,deal_ym').range(from, from + 9999);
    if (error || !data?.length) break;
    data.forEach(r => existingSet.add(`${r.lawd_cd}:${r.deal_ym}`));
    if (data.length < 10000) break;
    from += 10000;
  }
}
console.log(`   기존 레코드: ${existingSet.size.toLocaleString()}건\n`);

// API 호출 → 건수 집계
async function fetchCounts(url, lawdCd, dealYmd) {
  let tradeCnt = 0, jeonseCnt = 0, wolseCnt = 0;
  let page = 1;
  while (true) {
    try {
      const u = `${url}?serviceKey=${encKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=1000`;
      const res  = await fetch(u, { signal: AbortSignal.timeout(12000) });
      const text = await res.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      if (!items.length) break;

      if (url.includes('Trade')) {
        tradeCnt += items.length;
      } else {
        for (const block of items) {
          const monthly = parseInt(block.match(/<monthlyRent>([^<]*)<\/monthlyRent>/)?.[1]?.trim() ?? '0') || 0;
          if (monthly === 0) jeonseCnt++; else wolseCnt++;
        }
      }

      const total = parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
      if (items.length < 1000 || page * 1000 >= total) break;
      page++;
      await sleep(100);
    } catch { break; }
  }
  return { tradeCnt, jeonseCnt, wolseCnt };
}

// 수집 실행
let done = 0, saved = 0, skipped = 0;
const total = allDistricts.length * months.length;
const CONCURRENCY = 8; // 동시 요청 수

const tasks = [];
for (const { lawdCd } of allDistricts) {
  for (const ym of months) {
    tasks.push({ lawdCd, ym });
  }
}

// 배치 처리
for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(async ({ lawdCd, ym }) => {
    const key = `${lawdCd}:${ym}`;
    if (!force && existingSet.has(key)) {
      skipped++;
      done++;
      return;
    }

    const [trade, rent] = await Promise.all([
      fetchCounts(TRADE_URL, lawdCd, ym),
      fetchCounts(RENT_URL,  lawdCd, ym),
    ]);

    const { error } = await db.from('district_trade_monthly').upsert({
      lawd_cd:    lawdCd,
      deal_ym:    ym,
      trade_cnt:  trade.tradeCnt,
      jeonse_cnt: rent.jeonseCnt,
      wolse_cnt:  rent.wolseCnt,
    }, { onConflict: 'lawd_cd,deal_ym' });

    if (!error) saved++;
    done++;
  }));

  process.stdout.write(
    `\r  진행: ${done.toLocaleString()}/${total.toLocaleString()} | 저장: ${saved} | 스킵: ${skipped}   `
  );

  // 쿼터 보호: 매 100배치마다 잠깐 대기
  if (i > 0 && (i / CONCURRENCY) % 100 === 0) await sleep(1000);
}

console.log(`\n\n🎉 완료! 저장: ${saved.toLocaleString()} | 스킵: ${skipped.toLocaleString()}`);
