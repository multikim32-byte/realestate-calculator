/**
 * 단지 실거래가 보강 스크립트
 *
 * 국토부 MOLIT API로 시군구 단위 거래 데이터 수집 →
 * 단지별 대표 평형(most-traded pyeong) + 평균 실거래가 계산 →
 * apartment_complexes.avg_pyeong / avg_price 업데이트
 *
 * 최적화: 단지별 API 호출 X → 시군구 단위 배치 호출 (6개월 × ~250 sigungu)
 *
 * 실행 전 Supabase에서 컬럼 추가:
 *   ALTER TABLE apartment_complexes
 *     ADD COLUMN IF NOT EXISTS avg_pyeong INT,
 *     ADD COLUMN IF NOT EXISTS avg_price  INT;
 *
 * 실행: node scripts/enrich-prices.mjs
 * 옵션: --force (이미 보강된 단지도 재계산)
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
  console.error('❌ 필수 환경변수 없음: MOLIT_API_KEY, NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);
const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const MONTHS = 6; // 최근 6개월 거래 기준
const force = process.argv.includes('--force');

// ── LAWD 코드 맵 (시도 → [{name, code}]) ─────────────────────────────────────
const LAWD_CODE_MAP = {
  '서울': [
    { name: '강남구', code: '11680' }, { name: '서초구', code: '11650' },
    { name: '송파구', code: '11710' }, { name: '강동구', code: '11740' },
    { name: '마포구', code: '11440' }, { name: '용산구', code: '11170' },
    { name: '성동구', code: '11200' }, { name: '광진구', code: '11215' },
    { name: '강서구', code: '11500' }, { name: '양천구', code: '11470' },
    { name: '영등포구', code: '11560' }, { name: '동작구', code: '11590' },
    { name: '관악구', code: '11620' }, { name: '금천구', code: '11545' },
    { name: '구로구', code: '11530' }, { name: '은평구', code: '11380' },
    { name: '서대문구', code: '11410' }, { name: '종로구', code: '11110' },
    { name: '중구', code: '11140' }, { name: '노원구', code: '11350' },
    { name: '도봉구', code: '11320' }, { name: '강북구', code: '11305' },
    { name: '성북구', code: '11290' }, { name: '동대문구', code: '11230' },
    { name: '중랑구', code: '11260' },
  ],
  '경기': [
    { name: '수원 장안구', code: '41111' }, { name: '수원 권선구', code: '41113' },
    { name: '수원 팔달구', code: '41115' }, { name: '수원 영통구', code: '41117' },
    { name: '성남 수정구', code: '41131' }, { name: '성남 중원구', code: '41133' },
    { name: '성남 분당구', code: '41135' }, { name: '안양 만안구', code: '41171' },
    { name: '안양 동안구', code: '41173' },
    { name: '부천 원미구', code: '41192' }, { name: '부천 소사구', code: '41194' },
    { name: '부천 오정구', code: '41196' },
    { name: '광명시', code: '41210' }, { name: '평택시', code: '41220' },
    { name: '동두천시', code: '41250' }, { name: '안산 상록구', code: '41271' },
    { name: '안산 단원구', code: '41273' }, { name: '고양 덕양구', code: '41281' },
    { name: '고양 일산동구', code: '41285' }, { name: '고양 일산서구', code: '41287' },
    { name: '과천시', code: '41290' }, { name: '구리시', code: '41310' },
    { name: '남양주시', code: '41360' }, { name: '오산시', code: '41370' },
    { name: '시흥시', code: '41390' }, { name: '군포시', code: '41410' },
    { name: '의왕시', code: '41430' }, { name: '하남시', code: '41450' },
    { name: '용인 처인구', code: '41461' }, { name: '용인 기흥구', code: '41463' },
    { name: '용인 수지구', code: '41465' }, { name: '파주시', code: '41480' },
    { name: '이천시', code: '41500' }, { name: '안성시', code: '41550' },
    { name: '김포시', code: '41570' }, { name: '화성시', code: '41590' },
    { name: '화성특례시', code: '41590' }, { name: '광주시', code: '41610' },
    { name: '양주시', code: '41630' }, { name: '포천시', code: '41650' },
    { name: '여주시', code: '41670' }, { name: '연천군', code: '41800' },
    { name: '가평군', code: '41820' }, { name: '양평군', code: '41830' },
    { name: '의정부시', code: '41150' },
  ],
  '인천': [
    { name: '중구', code: '28110' }, { name: '동구', code: '28140' },
    { name: '미추홀구', code: '28177' }, { name: '연수구', code: '28185' },
    { name: '남동구', code: '28200' }, { name: '부평구', code: '28237' },
    { name: '계양구', code: '28245' }, { name: '서구', code: '28260' },
    { name: '강화군', code: '28710' }, { name: '옹진군', code: '28720' },
  ],
  '부산': [
    { name: '중구', code: '26110' }, { name: '서구', code: '26140' },
    { name: '동구', code: '26170' }, { name: '영도구', code: '26200' },
    { name: '부산진구', code: '26230' }, { name: '동래구', code: '26260' },
    { name: '남구', code: '26290' }, { name: '북구', code: '26320' },
    { name: '해운대구', code: '26350' }, { name: '사하구', code: '26380' },
    { name: '금정구', code: '26410' }, { name: '강서구', code: '26440' },
    { name: '연제구', code: '26470' }, { name: '수영구', code: '26500' },
    { name: '사상구', code: '26530' }, { name: '기장군', code: '26710' },
  ],
  '대구': [
    { name: '중구', code: '27110' }, { name: '동구', code: '27140' },
    { name: '서구', code: '27170' }, { name: '남구', code: '27200' },
    { name: '북구', code: '27230' }, { name: '수성구', code: '27260' },
    { name: '달서구', code: '27290' }, { name: '달성군', code: '27710' },
    { name: '군위군', code: '27720' },
  ],
  '광주': [
    { name: '동구', code: '29110' }, { name: '서구', code: '29140' },
    { name: '남구', code: '29155' }, { name: '북구', code: '29170' },
    { name: '광산구', code: '29200' },
  ],
  '대전': [
    { name: '동구', code: '30110' }, { name: '중구', code: '30140' },
    { name: '서구', code: '30170' }, { name: '유성구', code: '30200' },
    { name: '대덕구', code: '30230' },
  ],
  '울산': [
    { name: '중구', code: '31110' }, { name: '남구', code: '31140' },
    { name: '동구', code: '31170' }, { name: '북구', code: '31200' },
    { name: '울주군', code: '31710' },
  ],
  '세종': [{ name: '세종시', code: '36110' }],
  '강원': [
    { name: '춘천시', code: '51110' }, { name: '원주시', code: '51130' },
    { name: '강릉시', code: '51150' }, { name: '동해시', code: '51170' },
    { name: '태백시', code: '51190' }, { name: '속초시', code: '51210' },
    { name: '삼척시', code: '51230' }, { name: '홍천군', code: '51720' },
    { name: '횡성군', code: '51730' }, { name: '영월군', code: '51750' },
    { name: '평창군', code: '51760' }, { name: '정선군', code: '51770' },
    { name: '철원군', code: '51780' }, { name: '화천군', code: '51790' },
    { name: '양구군', code: '51800' }, { name: '인제군', code: '51810' },
    { name: '고성군', code: '51820' }, { name: '양양군', code: '51830' },
  ],
  '충북': [
    { name: '청주 상당구', code: '43111' }, { name: '청주 서원구', code: '43112' },
    { name: '청주 흥덕구', code: '43113' }, { name: '청주 청원구', code: '43114' },
    { name: '충주시', code: '43130' }, { name: '제천시', code: '43150' },
    { name: '보은군', code: '43720' }, { name: '옥천군', code: '43730' },
    { name: '영동군', code: '43740' }, { name: '증평군', code: '43745' },
    { name: '진천군', code: '43750' }, { name: '괴산군', code: '43760' },
    { name: '음성군', code: '43770' }, { name: '단양군', code: '43800' },
  ],
  '충남': [
    { name: '천안 동남구', code: '44131' }, { name: '천안 서북구', code: '44133' },
    { name: '공주시', code: '44150' }, { name: '보령시', code: '44180' },
    { name: '아산시', code: '44200' }, { name: '서산시', code: '44210' },
    { name: '논산시', code: '44230' }, { name: '계룡시', code: '44250' },
    { name: '당진시', code: '44270' }, { name: '금산군', code: '44710' },
    { name: '부여군', code: '44760' }, { name: '서천군', code: '44770' },
    { name: '청양군', code: '44790' }, { name: '홍성군', code: '44800' },
    { name: '예산군', code: '44810' }, { name: '태안군', code: '44825' },
  ],
  '전북': [
    { name: '전주 완산구', code: '52111' }, { name: '전주 덕진구', code: '52113' },
    { name: '군산시', code: '52130' }, { name: '익산시', code: '52140' },
    { name: '정읍시', code: '52180' }, { name: '남원시', code: '52190' },
    { name: '김제시', code: '52210' }, { name: '완주군', code: '52710' },
    { name: '진안군', code: '52720' }, { name: '무주군', code: '52730' },
    { name: '장수군', code: '52740' }, { name: '임실군', code: '52750' },
    { name: '순창군', code: '52770' }, { name: '고창군', code: '52790' },
    { name: '부안군', code: '52800' },
  ],
  '전남': [
    { name: '목포시', code: '46110' }, { name: '여수시', code: '46130' },
    { name: '순천시', code: '46150' }, { name: '나주시', code: '46170' },
    { name: '광양시', code: '46230' }, { name: '담양군', code: '46710' },
    { name: '곡성군', code: '46720' }, { name: '구례군', code: '46730' },
    { name: '고흥군', code: '46770' }, { name: '보성군', code: '46780' },
    { name: '화순군', code: '46790' }, { name: '장흥군', code: '46800' },
    { name: '강진군', code: '46810' }, { name: '해남군', code: '46820' },
    { name: '영암군', code: '46830' }, { name: '무안군', code: '46840' },
    { name: '함평군', code: '46860' }, { name: '영광군', code: '46870' },
    { name: '장성군', code: '46880' }, { name: '완도군', code: '46890' },
    { name: '진도군', code: '46900' }, { name: '신안군', code: '46910' },
  ],
  '경북': [
    { name: '포항 남구', code: '47111' }, { name: '포항 북구', code: '47113' },
    { name: '경주시', code: '47130' }, { name: '김천시', code: '47150' },
    { name: '안동시', code: '47170' }, { name: '구미시', code: '47190' },
    { name: '영주시', code: '47210' }, { name: '영천시', code: '47220' },
    { name: '상주시', code: '47230' }, { name: '문경시', code: '47250' },
    { name: '경산시', code: '47290' }, { name: '의성군', code: '47730' },
    { name: '청송군', code: '47740' }, { name: '영양군', code: '47760' },
    { name: '영덕군', code: '47770' }, { name: '청도군', code: '47820' },
    { name: '고령군', code: '47830' }, { name: '성주군', code: '47840' },
    { name: '칠곡군', code: '47850' }, { name: '예천군', code: '47900' },
    { name: '봉화군', code: '47920' }, { name: '울진군', code: '47930' },
    { name: '울릉군', code: '47940' },
  ],
  '경남': [
    { name: '창원 의창구', code: '48121' }, { name: '창원 성산구', code: '48123' },
    { name: '창원 마산합포구', code: '48125' }, { name: '창원 마산회원구', code: '48127' },
    { name: '창원 진해구', code: '48129' }, { name: '진주시', code: '48170' },
    { name: '통영시', code: '48220' }, { name: '사천시', code: '48240' },
    { name: '김해시', code: '48250' }, { name: '밀양시', code: '48270' },
    { name: '거제시', code: '48310' }, { name: '양산시', code: '48330' },
    { name: '의령군', code: '48720' }, { name: '함안군', code: '48730' },
    { name: '창녕군', code: '48740' }, { name: '고성군', code: '48820' },
    { name: '남해군', code: '48840' }, { name: '하동군', code: '48850' },
    { name: '산청군', code: '48860' }, { name: '함양군', code: '48870' },
    { name: '거창군', code: '48880' }, { name: '합천군', code: '48890' },
  ],
  '제주': [
    { name: '제주시', code: '50110' }, { name: '서귀포시', code: '50130' },
  ],
};

// ── LAWD 코드 조회 ────────────────────────────────────────────────────────────
function getLawdCode(sido, sigungu) {
  const districts = LAWD_CODE_MAP[sido] ?? [];
  const exact = districts.find(d => d.name === sigungu);
  if (exact) return exact.code;
  const partial = districts.find(d => sigungu.includes(d.name) || d.name.includes(sigungu));
  return partial?.code ?? null;
}

// ── MOLIT XML 파싱 ────────────────────────────────────────────────────────────
function parseTrades(xml) {
  const trades = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of blocks) {
    const get = tag => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };
    // 해제 건 제외
    const cdeal = get('cdealType').trim();
    if (cdeal && cdeal !== ' ') continue;

    const name      = get('aptNm');
    const price     = parseInt(get('dealAmount').replace(/,/g, '')) || 0;
    const area      = parseFloat(get('excluUseAr')) || 0;
    const buildYear = parseInt(get('buildYear')) || 0;
    if (!name || !price || !area) continue;
    trades.push({ name, price, area, buildYear });
  }
  return trades;
}

// ── 시군구 × 월 단위 MOLIT 조회 ──────────────────────────────────────────────
async function fetchTrades(lawdCode, ym) {
  try {
    const url = `${TRADE_URL}?serviceKey=${encodeURIComponent(MOLIT_KEY)}&LAWD_CD=${lawdCode}&DEAL_YMD=${ym}&numOfRows=2000`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    return parseTrades(await res.text());
  } catch {
    return [];
  }
}

// ── 최근 N개월 YYYYMM 목록 ────────────────────────────────────────────────────
function recentYMs(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// 영문 브랜드 → 한글 변환 (MOLIT은 한글 표기 사용)
const BRAND_NORM = [
  [/^lg/i,       '엘지'],
  [/^gs/i,       '지에스'],
  [/^sk/i,       '에스케이'],
  [/^kcc/i,      '케이씨씨'],
  [/^hdc/i,      '에이치디씨'],
  [/^dL/i,       '디엘'],
  [/^e편한세상/,  '이편한세상'],
  [/^eg/i,       '이지'],
];

// ── 이름 정규화 ───────────────────────────────────────────────────────────────
function normName(s) {
  let n = (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  for (const [pat, rep] of BRAND_NORM) n = n.replace(pat, rep);
  return n;
}

// ── 단지 이름 매칭 ─────────────────────────────────────────────────────────────
function matchName(tradeName, complexName) {
  const a = normName(tradeName);
  const b = normName(complexName);
  return a.includes(b) || b.includes(a);
}

// ── 대표 평형 + 평균가 계산 ───────────────────────────────────────────────────
function calcStats(trades) {
  if (trades.length === 0) return null;

  // 평형별 그룹 (1평 = 3.3058㎡)
  const byPyeong = new Map();
  for (const t of trades) {
    const pyeong = Math.round(t.area / 3.3058);
    if (!byPyeong.has(pyeong)) byPyeong.set(pyeong, []);
    byPyeong.get(pyeong).push(t.price);
  }

  // 가장 많이 거래된 평형 (mode)
  let maxCount = 0;
  let modePyeong = 0;
  for (const [pyeong, prices] of byPyeong) {
    if (prices.length > maxCount) {
      maxCount = prices.length;
      modePyeong = pyeong;
    }
  }

  const prices = byPyeong.get(modePyeong);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  // built_year: trades에서 가장 많이 등장한 값
  const byYearMap = new Map();
  for (const t of trades) {
    if (t.buildYear > 1900) byYearMap.set(t.buildYear, (byYearMap.get(t.buildYear) ?? 0) + 1);
  }
  let built_year = null;
  if (byYearMap.size > 0) {
    built_year = [...byYearMap.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  return { avg_pyeong: modePyeong, avg_price: avgPrice, built_year };
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('💰 단지 실거래가 보강 시작');
  console.log(`   기준: 최근 ${MONTHS}개월 | ${force ? '전체 재계산' : '미보강 단지만'}\n`);

  // 단지 전체 로드 (페이지네이션)
  let query = supabase
    .from('apartment_complexes')
    .select('kapt_code, name, sido, sigungu')
    .not('sido', 'is', null)
    .not('sigungu', 'is', null);

  if (!force) query = query.is('avg_price', null);

  const complexes = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page, error } = await query.order('kapt_code').range(from, from + PAGE - 1);
    if (error) { console.error('조회 오류:', error.message); break; }
    if (!page || page.length === 0) break;
    complexes.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  console.log(`📍 보강 대상: ${complexes.length.toLocaleString()}개\n`);
  if (complexes.length === 0) { console.log('✅ 보강할 단지 없음'); return; }

  // 시군구별 그룹핑
  const groups = new Map(); // key: "sido::sigungu::lawdCode"
  for (const c of complexes) {
    const code = getLawdCode(c.sido, c.sigungu);
    if (!code) continue;
    const key = `${c.sido}::${c.sigungu}::${code}`;
    if (!groups.has(key)) groups.set(key, { lawdCode: code, complexes: [] });
    groups.get(key).complexes.push(c);
  }

  const yms = recentYMs(MONTHS);
  const totalGroups = groups.size;
  let groupDone = 0;
  let enriched = 0;
  let skipped = 0; // 거래 없음
  const updates = [];

  for (const [key, { lawdCode, complexes: group }] of groups) {
    const [sido, sigungu] = key.split('::');
    process.stdout.write(`\r  [${++groupDone}/${totalGroups}] ${sido} ${sigungu} (${group.length}개 단지)`.padEnd(70));

    // 6개월치 거래 수집
    const allTrades = [];
    for (const ym of yms) {
      const trades = await fetchTrades(lawdCode, ym);
      allTrades.push(...trades);
      await sleep(200);
    }

    // 단지별 매칭 + 통계 계산
    for (const c of group) {
      const matched = allTrades.filter(t => matchName(t.name, c.name));
      const stats = calcStats(matched);
      if (stats) {
        updates.push({ kapt_code: c.kapt_code, ...stats });
        enriched++;
      } else {
        skipped++;
      }
    }

    // 100건마다 배치 upsert
    if (updates.length >= 100) {
      await flushUpdates(updates.splice(0, updates.length));
    }
  }

  // 남은 업데이트
  if (updates.length > 0) await flushUpdates(updates);

  console.log(`\n\n🎉 완료! 보강: ${enriched.toLocaleString()}개 | 거래없음(스킵): ${skipped.toLocaleString()}개`);
}

async function flushUpdates(batch) {
  const now = new Date().toISOString();
  await Promise.all(batch.map(({ kapt_code, avg_pyeong, avg_price, built_year }) => {
    const payload = { avg_pyeong, avg_price, updated_at: now };
    if (built_year) payload.built_year = built_year;
    return supabase
      .from('apartment_complexes')
      .update(payload)
      .eq('kapt_code', kapt_code)
      .then(({ error }) => {
        if (error) console.error(`\n⚠️  ${kapt_code} 업데이트 오류:`, error.message);
      });
  }));
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
