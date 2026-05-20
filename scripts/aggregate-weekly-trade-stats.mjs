/**
 * 주간 아파트 실거래가 통계 집계 스크립트
 * 매주 월요일 GitHub Actions에서 실행 (03:00 KST)
 *
 * 집계 항목 (이번주 월~일 기준):
 *  - 급등 TOP 10  : 지난주 대비 평균 거래가 상승률
 *  - 급락 TOP 10  : 지난주 대비 평균 거래가 하락률
 *  - 신고가 TOP 10: 이번주 최고 거래가 단지
 *  - 거래량 TOP 10: 이번주 거래 건수 많은 단지
 *
 * 필수 env: MOLIT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 필수 Supabase migration:
 *   ALTER TABLE trade_stats ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'monthly';
 *   CREATE UNIQUE INDEX IF NOT EXISTS trade_stats_stat_date_period_key ON trade_stats (stat_date, period);
 */

import { setTimeout as sleep } from 'node:timers/promises';

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

const MOLIT_KEY = process.env.MOLIT_API_KEY?.trim();
const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MOLIT_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경 변수 없음: MOLIT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── 전국 시군구 코드 ───────────────────────────────────────────────────────────
const DISTRICTS = [
  // 서울 (25)
  { sido: '서울', name: '종로구',    code: '11110' },
  { sido: '서울', name: '중구',      code: '11140' },
  { sido: '서울', name: '용산구',    code: '11170' },
  { sido: '서울', name: '성동구',    code: '11200' },
  { sido: '서울', name: '광진구',    code: '11215' },
  { sido: '서울', name: '동대문구',  code: '11230' },
  { sido: '서울', name: '중랑구',    code: '11260' },
  { sido: '서울', name: '성북구',    code: '11290' },
  { sido: '서울', name: '강북구',    code: '11305' },
  { sido: '서울', name: '도봉구',    code: '11320' },
  { sido: '서울', name: '노원구',    code: '11350' },
  { sido: '서울', name: '은평구',    code: '11380' },
  { sido: '서울', name: '서대문구',  code: '11410' },
  { sido: '서울', name: '마포구',    code: '11440' },
  { sido: '서울', name: '양천구',    code: '11470' },
  { sido: '서울', name: '강서구',    code: '11500' },
  { sido: '서울', name: '구로구',    code: '11530' },
  { sido: '서울', name: '금천구',    code: '11545' },
  { sido: '서울', name: '영등포구',  code: '11560' },
  { sido: '서울', name: '동작구',    code: '11590' },
  { sido: '서울', name: '관악구',    code: '11620' },
  { sido: '서울', name: '서초구',    code: '11650' },
  { sido: '서울', name: '강남구',    code: '11680' },
  { sido: '서울', name: '송파구',    code: '11710' },
  { sido: '서울', name: '강동구',    code: '11740' },
  // 경기 (36)
  { sido: '경기', name: '수원 장안구',   code: '41111' },
  { sido: '경기', name: '수원 권선구',   code: '41113' },
  { sido: '경기', name: '수원 팔달구',   code: '41115' },
  { sido: '경기', name: '수원 영통구',   code: '41117' },
  { sido: '경기', name: '성남 수정구',   code: '41131' },
  { sido: '경기', name: '성남 중원구',   code: '41133' },
  { sido: '경기', name: '성남 분당구',   code: '41135' },
  { sido: '경기', name: '의정부시',      code: '41150' },
  { sido: '경기', name: '안양 만안구',   code: '41171' },
  { sido: '경기', name: '안양 동안구',   code: '41173' },
  { sido: '경기', name: '부천 원미구',   code: '41192' },
  { sido: '경기', name: '광명시',        code: '41210' },
  { sido: '경기', name: '평택시',        code: '41220' },
  { sido: '경기', name: '안산 상록구',   code: '41271' },
  { sido: '경기', name: '안산 단원구',   code: '41273' },
  { sido: '경기', name: '고양 덕양구',   code: '41281' },
  { sido: '경기', name: '고양 일산동구', code: '41285' },
  { sido: '경기', name: '고양 일산서구', code: '41287' },
  { sido: '경기', name: '과천시',        code: '41290' },
  { sido: '경기', name: '구리시',        code: '41310' },
  { sido: '경기', name: '남양주시',      code: '41360' },
  { sido: '경기', name: '시흥시',        code: '41390' },
  { sido: '경기', name: '군포시',        code: '41410' },
  { sido: '경기', name: '하남시',        code: '41450' },
  { sido: '경기', name: '용인 처인구',   code: '41461' },
  { sido: '경기', name: '용인 기흥구',   code: '41463' },
  { sido: '경기', name: '용인 수지구',   code: '41465' },
  { sido: '경기', name: '파주시',        code: '41480' },
  { sido: '경기', name: '이천시',        code: '41500' },
  { sido: '경기', name: '김포시',        code: '41570' },
  { sido: '경기', name: '화성시',        code: '41590' },
  { sido: '경기', name: '광주시',        code: '41610' },
  { sido: '경기', name: '양주시',        code: '41630' },
  // 인천 (8)
  { sido: '인천', name: '중구',    code: '28110' },
  { sido: '인천', name: '연수구',  code: '28185' },
  { sido: '인천', name: '남동구',  code: '28200' },
  { sido: '인천', name: '부평구',  code: '28237' },
  { sido: '인천', name: '계양구',  code: '28245' },
  { sido: '인천', name: '서구',    code: '28260' },
  { sido: '인천', name: '미추홀구', code: '28177' },
  { sido: '인천', name: '서구',    code: '28260' },
  // 부산 (15)
  { sido: '부산', name: '해운대구', code: '26350' },
  { sido: '부산', name: '수영구',  code: '26380' },
  { sido: '부산', name: '남구',    code: '26290' },
  { sido: '부산', name: '동래구',  code: '26260' },
  { sido: '부산', name: '부산진구', code: '26230' },
  { sido: '부산', name: '연제구',  code: '26370' },
  { sido: '부산', name: '사하구',  code: '26320' },
  { sido: '부산', name: '강서구',  code: '26440' },
  { sido: '부산', name: '기장군',  code: '26710' },
  // 대구 (7)
  { sido: '대구', name: '수성구',  code: '27290' },
  { sido: '대구', name: '달서구',  code: '27290' },
  { sido: '대구', name: '북구',    code: '27230' },
  { sido: '대구', name: '달성군',  code: '27710' },
  // 광주 (5)
  { sido: '광주', name: '서구',    code: '29140' },
  { sido: '광주', name: '남구',    code: '29155' },
  { sido: '광주', name: '북구',    code: '29170' },
  { sido: '광주', name: '광산구',  code: '29200' },
  // 대전 (5)
  { sido: '대전', name: '유성구',  code: '30230' },
  { sido: '대전', name: '서구',    code: '30170' },
  { sido: '대전', name: '중구',    code: '30140' },
  // 울산 (4)
  { sido: '울산', name: '남구',    code: '31140' },
  { sido: '울산', name: '울주군',  code: '31710' },
  // 세종
  { sido: '세종', name: '세종시',  code: '36110' },
  // 제주
  { sido: '제주', name: '제주시',  code: '50110' },
  { sido: '제주', name: '서귀포시', code: '50130' },
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function toYm(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function xmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function parseItems(xml, sido, gu) {
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const result = [];
  for (const block of blocks) {
    if (xmlVal(block, 'cdealType').trim().replace(/\s/g, '')) continue;
    const price = parseInt(xmlVal(block, 'dealAmount').replace(/[,\s]/g, '')) || 0;
    if (price === 0) continue;
    const area = parseFloat(xmlVal(block, 'excluUseAr')) || 0;
    if (area === 0) continue;
    const y = xmlVal(block, 'dealYear');
    const m = xmlVal(block, 'dealMonth').padStart(2, '0');
    const d = xmlVal(block, 'dealDay').padStart(2, '0');
    result.push({
      name:      xmlVal(block, 'aptNm'),
      dong:      xmlVal(block, 'umdNm'),
      area,
      floor:     parseInt(xmlVal(block, 'floor')) || 0,
      price,
      dealDate:  y ? `${y}-${m}-${d}` : '',
      builtYear: parseInt(xmlVal(block, 'buildYear')) || 0,
      sido,
      gu,
    });
  }
  return result;
}

async function fetchDistrict(code, dealYmd, sido, gu) {
  const numOfRows = 1000;
  let page = 1;
  const all = [];

  while (true) {
    const qs = `serviceKey=${MOLIT_KEY}&pageNo=${page}&numOfRows=${numOfRows}&LAWD_CD=${code}&DEAL_YMD=${dealYmd}`;
    let xml = '';
    try {
      const res = await fetch(`${TRADE_URL}?${qs}`, { signal: AbortSignal.timeout(30000) });
      xml = await res.text();
    } catch (e) {
      console.warn(`  ⚠️  ${sido} ${gu} ${dealYmd} p${page}: ${e.message}`);
      break;
    }
    if (xml.includes('<errMsg>') || xml.includes('SERVICE_KEY') || xml.includes('returnReasonCode')) break;

    all.push(...parseItems(xml, sido, gu));
    const total = parseInt(xmlVal(xml, 'totalCount')) || 0;
    if (page * numOfRows >= total) break;
    page++;
    await sleep(100);
  }
  return all;
}

// ── 집계 메인 ─────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun

  // 이번주 월요일 (집계 기준: 지난주 월~일)
  // 월요일 새벽에 실행 → 지난주(방금 끝난 주) 데이터 집계
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // 지난주 = 이번주 - 7일
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);

  const weekStart = monday.toISOString().slice(0, 10);
  const weekEnd   = new Date(monday.getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const prevStart = prevMonday.toISOString().slice(0, 10);
  const prevEnd   = new Date(prevMonday.getTime() + 6 * 86400000).toISOString().slice(0, 10);

  // 필요한 월 집합 (이번주 + 지난주가 걸쳐 있는 모든 월)
  const neededYms = new Set([
    toYm(monday),
    toYm(new Date(monday.getTime() + 6 * 86400000)),
    toYm(prevMonday),
    toYm(new Date(prevMonday.getTime() + 6 * 86400000)),
  ]);
  const ymList = [...neededYms];

  console.log(`\n📊 주간 실거래 통계 집계 시작`);
  console.log(`  이번주: ${weekStart} ~ ${weekEnd}`);
  console.log(`  지난주: ${prevStart} ~ ${prevEnd}`);
  console.log(`  수집 월: ${ymList.join(', ')}`);
  console.log(`  지역: ${DISTRICTS.length}개 시군구\n`);

  // 모든 필요한 월 데이터 수집
  const tradesByYm = {};
  for (const ym of ymList) tradesByYm[ym] = [];

  for (let i = 0; i < DISTRICTS.length; i++) {
    const { sido, name, code } = DISTRICTS[i];
    const pct = Math.round(((i + 1) / DISTRICTS.length) * 100);
    process.stdout.write(`\r[${String(pct).padStart(3)}%] ${sido} ${name}                     `);

    for (const ym of ymList) {
      const items = await fetchDistrict(code, ym, sido, name);
      tradesByYm[ym].push(...items);
      await sleep(120);
    }
  }
  process.stdout.write('\n');

  // 이번주 / 지난주 거래만 필터
  const allTrades = Object.values(tradesByYm).flat();
  const thisWeek  = allTrades.filter(t => t.dealDate >= weekStart && t.dealDate <= weekEnd);
  const lastWeek  = allTrades.filter(t => t.dealDate >= prevStart && t.dealDate <= prevEnd);

  console.log(`\n✅ 수집 완료: 이번주 ${thisWeek.length}건 / 지난주 ${lastWeek.length}건`);

  // ── 급등/급락: (name + dong + areaBucket) 단위 주간 평균가 비교 ────────────
  const bucket = (area) => Math.round(area / 5) * 5;
  const grpKey  = (t) => `${t.name}__${t.dong}__${bucket(t.area)}__${t.sido}__${t.gu}`;

  const buildGroups = (trades) => {
    const m = new Map();
    for (const t of trades) {
      const k = grpKey(t);
      if (!m.has(k)) m.set(k, { trades: [], meta: t });
      m.get(k).trades.push(t);
    }
    return m;
  };

  const currGroups = buildGroups(thisWeek);
  const prevGroups = buildGroups(lastWeek);

  const changeList = [];
  for (const [k, { trades: cTrades, meta }] of currGroups) {
    if (cTrades.length < 1) continue;
    const pg = prevGroups.get(k);
    if (!pg || pg.trades.length < 1) continue;
    const cAvg = cTrades.reduce((s, t) => s + t.price, 0) / cTrades.length;
    const pAvg = pg.trades.reduce((s, t) => s + t.price, 0) / pg.trades.length;
    const pct  = ((cAvg - pAvg) / pAvg) * 100;
    changeList.push({
      name:       meta.name,
      dong:       meta.dong,
      location:   `${meta.sido} ${meta.gu}`,
      areaBucket: bucket(meta.area),
      builtYear:  meta.builtYear || 0,
      currentAvg: Math.round(cAvg),
      prevAvg:    Math.round(pAvg),
      changePct:  Math.round(pct * 10) / 10,
      count:      cTrades.length,
    });
  }

  const rising = changeList
    .filter(v => v.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 10)
    .map((v, i) => ({ rank: i + 1, ...v }));

  const falling = changeList
    .filter(v => v.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 10)
    .map((v, i) => ({ rank: i + 1, ...v }));

  // ── 신고가: 이번주 최고가 거래 ────────────────────────────────────────────────
  const priceMap = new Map();
  for (const t of thisWeek) {
    const k = `${t.name}__${t.dong}__${t.sido}__${t.gu}`;
    if (!priceMap.has(k) || t.price > priceMap.get(k).price) priceMap.set(k, t);
  }
  const topPrice = [...priceMap.values()]
    .sort((a, b) => b.price - a.price)
    .slice(0, 10)
    .map((t, i) => ({
      rank:      i + 1,
      name:      t.name,
      dong:      t.dong,
      location:  `${t.sido} ${t.gu}`,
      area:      Math.round(t.area),
      price:     t.price,
      dealDate:  t.dealDate,
      floor:     t.floor,
      builtYear: t.builtYear || 0,
    }));

  // ── 거래량: 이번주 거래 건수 ──────────────────────────────────────────────────
  const volMap = new Map();
  for (const t of thisWeek) {
    const k = `${t.name}__${t.dong}__${t.sido}__${t.gu}`;
    if (!volMap.has(k)) volMap.set(k, { count: 0, total: 0, meta: t });
    const g = volMap.get(k);
    g.count++;
    g.total += t.price;
  }
  const topVolume = [...volMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ count, total, meta }, i) => ({
      rank:      i + 1,
      name:      meta.name,
      dong:      meta.dong,
      location:  `${meta.sido} ${meta.gu}`,
      builtYear: meta.builtYear || 0,
      count,
      avgPrice:  Math.round(total / count),
    }));

  // ── Supabase 저장 ─────────────────────────────────────────────────────────────
  const statDate = weekStart; // 이번주 월요일 날짜를 stat_date로 사용
  const payload = {
    stat_date:            statDate,
    period:               'weekly',
    current_month:        toYm(monday),
    prev_month:           toYm(prevMonday),
    week_start:           weekStart,
    week_end:             weekEnd,
    rising,
    falling,
    top_price:            topPrice,
    top_volume:           topVolume,
    total_trades_current: thisWeek.length,
    total_trades_prev:    lastWeek.length,
  };

  const res = await fetch(`${SB_URL}/rest/v1/trade_stats?on_conflict=stat_date,period`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey:          SB_KEY,
      Authorization:  `Bearer ${SB_KEY}`,
      Prefer:         'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('❌ Supabase 저장 실패:', res.status, txt);
    console.error('  → Supabase에 period, week_start, week_end 컬럼이 있는지 확인하세요');
    process.exit(1);
  }

  console.log(`\n✅ 주간 통계 저장 완료 (${statDate})`);
  console.log(`  급등: ${rising.length}건 | 급락: ${falling.length}건`);
  console.log(`  신고가: ${topPrice.length}건 | 거래량: ${topVolume.length}건`);
  if (rising[0])    console.log(`  📈 급등 1위: ${rising[0].name} (${rising[0].location}) +${rising[0].changePct}%`);
  if (falling[0])   console.log(`  📉 급락 1위: ${falling[0].name} (${falling[0].location}) ${falling[0].changePct}%`);
  if (topPrice[0])  console.log(`  🏆 신고가 1위: ${topPrice[0].name} ${topPrice[0].price.toLocaleString()}만원`);
  if (topVolume[0]) console.log(`  🔥 거래량 1위: ${topVolume[0].name} ${topVolume[0].count}건`);
}

main().catch(e => {
  console.error('❌ 스크립트 오류:', e);
  process.exit(1);
});
