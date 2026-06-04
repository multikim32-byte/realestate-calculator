/**
 * 시군구/단지별 월별 거래량 이력 수집 스크립트
 *
 * 한 번의 API 호출로 두 테이블 동시 채움:
 *   district_trade_monthly  — 시군구 단위 집계
 *   apt_trade_monthly       — 단지/동 단위 집계
 *
 * 실행: node scripts/collect-district-monthly.mjs
 * 옵션:
 *   --from=200601   시작 년월 (기본: 200601)
 *   --to=202612     종료 년월 (기본: 전달)
 *   --sido=서울     특정 시도만 수집
 *   --force         이미 있는 데이터도 재수집
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
const rawArgs = process.argv.slice(2);
const argMap  = Object.fromEntries(rawArgs.filter(a => a.includes('=')).map(a => a.split('=')));
const force      = rawArgs.includes('--force');
const filterSido = argMap['--sido'];
const fromYm     = argMap['--from'] ?? '200601';
const toD        = new Date(); toD.setMonth(toD.getMonth() - 1);
const toYm       = argMap['--to'] ?? `${toD.getFullYear()}${String(toD.getMonth() + 1).padStart(2,'0')}`;

const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');

// 수집 대상 시군구 목록
const districts = [];
for (const [sido, list] of Object.entries(LAWD_CODE_MAP)) {
  if (filterSido && sido !== filterSido) continue;
  for (const { name, code } of list) districts.push({ sido, sigungu: name, lawdCd: code });
}
console.log(`📍 대상 시군구: ${districts.length}개 | 기간: ${fromYm} ~ ${toYm}\n`);

// 년월 목록 (최신→과거 역순)
function ymList(from, to) {
  const list = [];
  let [y, m] = [parseInt(to.slice(0,4)), parseInt(to.slice(4,6))];
  const [fy, fm] = [parseInt(from.slice(0,4)), parseInt(from.slice(4,6))];
  while (y > fy || (y === fy && m >= fm)) {
    list.push(`${y}${String(m).padStart(2,'0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  return list;
}
const months = ymList(fromYm, toYm);

// 기존 수집 완료 키 로드
console.log('🔍 기존 데이터 확인 중...');
const existingSet = new Set();
if (!force) {
  let from = 0;
  while (true) {
    const { data, error } = await db.from('district_trade_monthly')
      .select('lawd_cd,deal_ym').range(from, from + 9999);
    if (error || !data?.length) break;
    data.forEach(r => existingSet.add(`${r.lawd_cd}:${r.deal_ym}`));
    if (data.length < 10000) break;
    from += 10000;
  }
}
console.log(`   기존 레코드: ${existingSet.size.toLocaleString()}건\n`);

// XML 파싱 헬퍼
function getTag(block, tag) {
  return block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';
}

// MOLIT API 전체 페이지 수집 → 단지별 집계 반환
async function fetchAndAggregate(url, lawdCd, dealYmd) {
  // aptKey → { cnt, totalPrice, totalDeposit, jeonseCnt, wolseCnt }
  const aptMap = new Map();
  let districtTrade = 0, districtJeonse = 0, districtWolse = 0;
  let page = 1;

  while (true) {
    try {
      const u = `${url}?serviceKey=${encKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=1000`;
      const res  = await fetch(u, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      if (!items.length) break;

      for (const block of items) {
        const aptName = getTag(block, 'aptNm') || getTag(block, 'apt_nm') || '(미상)';
        const dong    = getTag(block, 'umdNm') || getTag(block, 'umd_nm') || '';
        const key     = `${aptName}||${dong}`;

        if (!aptMap.has(key)) aptMap.set(key, { aptName, dong, tradeCnt: 0, jeonseCnt: 0, wolseCnt: 0, totalPrice: 0, totalDeposit: 0 });
        const a = aptMap.get(key);

        if (url.includes('Trade')) {
          const price = parseInt(getTag(block, 'dealAmount').replace(/,/g,'')) || 0;
          a.tradeCnt++;
          if (price > 0) a.totalPrice += price;
          districtTrade++;
        } else {
          const monthly = parseInt(getTag(block, 'monthlyRent') || '0') || 0;
          const deposit = parseInt((getTag(block, 'deposit') || '0').replace(/,/g,'')) || 0;
          if (monthly === 0) { a.jeonseCnt++; a.totalDeposit += deposit; districtJeonse++; }
          else                { a.wolseCnt++;                              districtWolse++; }
        }
      }

      const total = parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
      if (items.length < 1000 || page * 1000 >= total) break;
      page++;
      await sleep(100);
    } catch { break; }
  }

  return { districtTrade, districtJeonse, districtWolse, aptMap };
}

// 메인 루프
let done = 0, saved = 0, skipped = 0;
const totalTasks = districts.length * months.length;
const CONCURRENCY = 5;

const tasks = districts.flatMap(d => months.map(ym => ({ ...d, ym })));

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY);

  await Promise.all(batch.map(async ({ lawdCd, ym }) => {
    const key = `${lawdCd}:${ym}`;
    if (!force && existingSet.has(key)) { skipped++; done++; return; }

    // 매매 + 전월세 동시 수집
    const [trade, rent] = await Promise.all([
      fetchAndAggregate(TRADE_URL, lawdCd, ym),
      fetchAndAggregate(RENT_URL,  lawdCd, ym),
    ]);

    // 1. district_trade_monthly upsert
    await db.from('district_trade_monthly').upsert({
      lawd_cd:    lawdCd,
      deal_ym:    ym,
      trade_cnt:  trade.districtTrade,
      jeonse_cnt: rent.districtJeonse,
      wolse_cnt:  rent.districtWolse,
    }, { onConflict: 'lawd_cd,deal_ym' });

    // 2. apt_trade_monthly upsert — 단지별 집계 병합
    const aptMerged = new Map();

    for (const [k, v] of [...trade.aptMap, ...rent.aptMap]) {
      if (!aptMerged.has(k)) aptMerged.set(k, { ...v });
      else {
        const m = aptMerged.get(k);
        m.tradeCnt    += v.tradeCnt;
        m.jeonseCnt   += v.jeonseCnt;
        m.wolseCnt    += v.wolseCnt;
        m.totalPrice  += v.totalPrice;
        m.totalDeposit += v.totalDeposit;
      }
    }

    const aptRows = [...aptMerged.values()].map(a => ({
      lawd_cd:          lawdCd,
      apt_name:         a.aptName,
      dong:             a.dong,
      deal_ym:          ym,
      trade_cnt:        a.tradeCnt,
      jeonse_cnt:       a.jeonseCnt,
      wolse_cnt:        a.wolseCnt,
      avg_trade_price:  a.tradeCnt  > 0 ? Math.round(a.totalPrice   / a.tradeCnt)  : null,
      avg_jeonse_price: a.jeonseCnt > 0 ? Math.round(a.totalDeposit / a.jeonseCnt) : null,
    }));

    // 배치 upsert (100개씩)
    for (let j = 0; j < aptRows.length; j += 100) {
      await db.from('apt_trade_monthly').upsert(
        aptRows.slice(j, j + 100),
        { onConflict: 'lawd_cd,apt_name,deal_ym' }
      );
    }

    saved++;
    done++;
  }));

  process.stdout.write(
    `\r  진행: ${done.toLocaleString()}/${totalTasks.toLocaleString()} | 저장: ${saved} | 스킵: ${skipped}   `
  );

  if ((i / CONCURRENCY) % 50 === 0 && i > 0) await sleep(500);
}

console.log(`\n\n🎉 완료! 저장: ${saved.toLocaleString()} | 스킵: ${skipped.toLocaleString()}`);
