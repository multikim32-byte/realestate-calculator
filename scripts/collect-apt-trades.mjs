/**
 * MOLIT 실거래가 건별 수집 스크립트
 *
 * apt_trade_monthly (월간 집계) 와 달리 건별 원시 데이터를 저장한다.
 * - 단지명·전용면적·층·거래일·가격 전부 저장
 * - 이게 있어야 평형별 시세, 정확한 단지 가격 계산 가능
 *
 * 실행:
 *   node scripts/collect-apt-trades.mjs              # 최근 12개월
 *   node scripts/collect-apt-trades.mjs --months=6   # 최근 6개월
 *   node scripts/collect-apt-trades.mjs --from=202401 --to=202412  # 기간 지정
 *   node scripts/collect-apt-trades.mjs --sido=서울  # 특정 시도만
 *   node scripts/collect-apt-trades.mjs --type=T     # T=매매 J=전세 W=월세 (기본: T,J)
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { createClient }        from '@supabase/supabase-js';
import { config }              from 'dotenv';
import { resolve }             from 'node:path';
import { fileURLToPath }       from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const MOLIT_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MOLIT_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경변수 없음: MOLIT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db     = createClient(SB_URL, SB_KEY);
const encKey = encodeURIComponent(MOLIT_KEY);

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const RENT_URL  = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

// ── 옵션 파싱 ─────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const argMap  = Object.fromEntries(rawArgs.filter(a => a.includes('=')).map(a => a.replace('--','').split('=')));

const filterSido = argMap['sido'];
const overwrite  = rawArgs.includes('--overwrite');       // jibun 백필용: 기존 행도 UPDATE
const typeArg    = (argMap['type'] ?? 'T,J').split(',');  // T=매매, J=전세
const collectT   = typeArg.includes('T');
const collectJ   = typeArg.includes('J');
const collectW   = typeArg.includes('W');

// 기간 계산
function getMonths(from, to) {
  const months = [];
  const d = new Date(from.slice(0,4)+'-'+from.slice(4,6)+'-01');
  const end = new Date(to.slice(0,4)+'-'+to.slice(4,6)+'-01');
  while (d <= end) {
    months.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`);
    d.setMonth(d.getMonth()+1);
  }
  return months;
}

let fromYm, toYm;
if (argMap['from'] && argMap['to']) {
  fromYm = argMap['from'];
  toYm   = argMap['to'];
} else {
  const monthsBack = parseInt(argMap['months'] ?? '12');
  const now = new Date();
  now.setMonth(now.getMonth() - 1); // 전달까지
  toYm = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
  const from = new Date(now);
  from.setMonth(from.getMonth() - (monthsBack - 1));
  fromYm = `${from.getFullYear()}${String(from.getMonth()+1).padStart(2,'0')}`;
}

const months = getMonths(fromYm, toYm);
console.log(`기간: ${fromYm} ~ ${toYm} (${months.length}개월)`);

const { LAWD_CODE_MAP } = await import('./lawd-codes.mjs');

const districts = [];
for (const [sido, list] of Object.entries(LAWD_CODE_MAP)) {
  if (filterSido && sido !== filterSido) continue;
  for (const d of list) districts.push({ sido, ...d });
}
console.log(`수집 대상: ${districts.length}개 시군구 × ${months.length}개월`);
console.log(`유형: ${[collectT&&'매매', collectJ&&'전세', collectW&&'월세'].filter(Boolean).join('/')}`);
console.log('');

// ── XML 파싱 헬퍼 ─────────────────────────────────────────────────────────────
function getTag(block, tag) {
  return block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';
}

// ── MOLIT API 건별 수집 ───────────────────────────────────────────────────────
async function fetchTrades(url, lawdCd, dealYmd, dealType) {
  const rows = [];
  let page = 1;

  while (true) {
    try {
      const u = `${url}?serviceKey=${encKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=1000`;
      const res  = await fetch(u, { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      if (!items.length) break;

      for (const block of items) {
        const aptName = (getTag(block, 'aptNm') || getTag(block, 'apt_nm') || '').trim();
        const dong    = (getTag(block, 'umdNm') || getTag(block, 'umd_nm') || '').trim();
        if (!aptName) continue;

        const excl      = parseFloat(getTag(block, 'excluUseAr') || getTag(block, 'exclu_use_ar') || '0') || null;
        const floorStr  = getTag(block, 'floor') || getTag(block, 'umdNo') || '';
        const floor     = parseInt(floorStr) || null;
        const dayStr    = getTag(block, 'dealDay') || getTag(block, 'deal_day') || '';
        const dealDay   = parseInt(dayStr) || null;
        const byStr     = getTag(block, 'buildYear') || getTag(block, 'build_year') || '';
        const buildYear = parseInt(byStr) || null;
        const jibun     = getTag(block, 'jibun')?.trim() || null;

        if (dealType === 'T') {
          const priceStr = getTag(block, 'dealAmount') || getTag(block, 'deal_amount') || '0';
          const price    = parseInt(priceStr.replace(/,/g,'')) || null;
          if (!price) continue;
          rows.push({ lawd_cd: lawdCd, apt_name: aptName, dong, exclusive_area: excl, floor, price, monthly_rent: null, deal_ym: dealYmd, deal_day: dealDay, build_year: buildYear, deal_type: 'T', jibun });

        } else {
          const deposit = parseInt((getTag(block, 'deposit') || '0').replace(/,/g,'')) || 0;
          const monthly = parseInt(getTag(block, 'monthlyRent') || '0') || 0;
          const type    = monthly === 0 ? 'J' : 'W';
          if ((type === 'J' && !collectJ) || (type === 'W' && !collectW)) continue;
          rows.push({ lawd_cd: lawdCd, apt_name: aptName, dong, exclusive_area: excl, floor, price: deposit || null, monthly_rent: monthly || null, deal_ym: dealYmd, deal_day: dealDay, build_year: buildYear, deal_type: type, jibun });
        }
      }

      const total = parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
      if (items.length < 1000 || page * 1000 >= total) break;
      page++;
      await sleep(120);
    } catch (e) {
      console.error(`  API 오류 (${lawdCd} ${dealYmd}):`, e.message);
      break;
    }
  }

  return rows;
}

// ── DB 배치 저장 ──────────────────────────────────────────────────────────────
function dedup(rows) {
  // --overwrite 시 같은 배치 안에 동일 키가 있으면 PostgreSQL이 오류를 냄 → 중복 제거
  // exclusive_area는 NUMERIC(7,2) 기준으로 비교 (float 표현 차이 방지)
  const seen = new Map();
  for (const r of rows) {
    const area = r.exclusive_area != null ? parseFloat(r.exclusive_area).toFixed(2) : 'null';
    const k = `${r.lawd_cd}|${r.apt_name}|${r.dong}|${area}|${r.floor ?? 'null'}|${r.deal_ym}|${r.deal_day ?? 'null'}|${r.deal_type}`;
    if (!seen.has(k) || (r.jibun && !seen.get(k).jibun)) seen.set(k, r);
  }
  return [...seen.values()];
}

async function saveRows(rows) {
  if (!rows.length) return 0;
  const BATCH = 500;
  let saved = 0;
  const toSave = overwrite ? dedup(rows) : rows;
  for (let i = 0; i < toSave.length; i += BATCH) {
    const slice = toSave.slice(i, i + BATCH);
    const { error } = await db
      .from('apt_trades')
      .upsert(slice, { onConflict: 'lawd_cd,apt_name,dong,exclusive_area,floor,deal_ym,deal_day,deal_type', ignoreDuplicates: !overwrite });
    if (error) console.error('  저장 오류:', error.message);
    else saved += slice.length;
  }
  return saved;
}

// ── 메인 루프 ─────────────────────────────────────────────────────────────────
const CONCURRENCY = 2;  // 과거 대량 수집 시 API 쿼터 보호용
let totalSaved = 0, done = 0;
const tasks = districts.flatMap(d => months.map(ym => ({ ...d, ym })));

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(async ({ code, ym }) => {
    const rows = [];
    if (collectT) rows.push(...await fetchTrades(TRADE_URL, code, ym, 'T'));
    if (collectJ || collectW) rows.push(...await fetchTrades(RENT_URL, code, ym, 'R'));
    return saveRows(rows);
  }));
  totalSaved += results.reduce((a,b) => a+b, 0);
  done += batch.length;

  if (done % 50 === 0 || done === tasks.length) {
    process.stdout.write(`\r  진행: ${done}/${tasks.length} 작업 | 저장: ${totalSaved.toLocaleString()}건`);
  }
  await sleep(300);  // API 쿼터 보호: 150ms → 300ms
}

console.log(`\n\n✅ 완료: ${totalSaved.toLocaleString()}건 저장`);
