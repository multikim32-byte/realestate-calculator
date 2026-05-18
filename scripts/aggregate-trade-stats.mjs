/**
 * 전국 아파트 실거래가 통계 집계 스크립트
 * 매일 GitHub Actions에서 실행 (03:00 KST)
 *
 * 집계 항목:
 *  - 급등 TOP 10  : 전월 대비 평균 거래가 상승률 (전용면적 버킷 기준)
 *  - 급락 TOP 10  : 전월 대비 평균 거래가 하락률
 *  - 신고가 TOP 10: 이번달 최고 거래가 단지
 *  - 거래량 TOP 10: 이번달 거래 건수 많은 단지
 *
 * 필수 env: MOLIT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { setTimeout as sleep } from 'node:timers/promises';

const TRADE_URL =
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

const MOLIT_KEY  = process.env.MOLIT_API_KEY?.trim();
const SB_URL     = process.env.SUPABASE_URL;
const SB_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MOLIT_KEY || !SB_URL || !SB_KEY) {
  console.error('❌ 필수 환경 변수 없음: MOLIT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── 전국 시군구 코드 ───────────────────────────────────────────────────────────
// 중복 코드 제거 (화성특례시 = 화성시 = 41590 → 1개만)
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
  // 경기 (42)
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
  { sido: '경기', name: '부천 소사구',   code: '41194' },
  { sido: '경기', name: '부천 오정구',   code: '41196' },
  { sido: '경기', name: '광명시',        code: '41210' },
  { sido: '경기', name: '평택시',        code: '41220' },
  { sido: '경기', name: '동두천시',      code: '41250' },
  { sido: '경기', name: '안산 상록구',   code: '41271' },
  { sido: '경기', name: '안산 단원구',   code: '41273' },
  { sido: '경기', name: '고양 덕양구',   code: '41281' },
  { sido: '경기', name: '고양 일산동구', code: '41285' },
  { sido: '경기', name: '고양 일산서구', code: '41287' },
  { sido: '경기', name: '과천시',        code: '41290' },
  { sido: '경기', name: '구리시',        code: '41310' },
  { sido: '경기', name: '남양주시',      code: '41360' },
  { sido: '경기', name: '오산시',        code: '41370' },
  { sido: '경기', name: '시흥시',        code: '41390' },
  { sido: '경기', name: '군포시',        code: '41410' },
  { sido: '경기', name: '의왕시',        code: '41430' },
  { sido: '경기', name: '하남시',        code: '41450' },
  { sido: '경기', name: '용인 처인구',   code: '41461' },
  { sido: '경기', name: '용인 기흥구',   code: '41463' },
  { sido: '경기', name: '용인 수지구',   code: '41465' },
  { sido: '경기', name: '파주시',        code: '41480' },
  { sido: '경기', name: '이천시',        code: '41500' },
  { sido: '경기', name: '안성시',        code: '41550' },
  { sido: '경기', name: '김포시',        code: '41570' },
  { sido: '경기', name: '화성시',        code: '41590' },
  { sido: '경기', name: '화성 남양향남권', code: '41591' },
  { sido: '경기', name: '화성 봉담권',   code: '41593' },
  { sido: '경기', name: '화성 병점반월권', code: '41595' },
  { sido: '경기', name: '광주시',        code: '41610' },
  { sido: '경기', name: '양주시',        code: '41630' },
  { sido: '경기', name: '포천시',        code: '41650' },
  { sido: '경기', name: '여주시',        code: '41670' },
  { sido: '경기', name: '연천군',        code: '41800' },
  { sido: '경기', name: '가평군',        code: '41820' },
  { sido: '경기', name: '양평군',        code: '41830' },
  // 인천 (10)
  { sido: '인천', name: '중구',    code: '28110' },
  { sido: '인천', name: '동구',    code: '28140' },
  { sido: '인천', name: '미추홀구', code: '28177' },
  { sido: '인천', name: '연수구',  code: '28185' },
  { sido: '인천', name: '남동구',  code: '28200' },
  { sido: '인천', name: '부평구',  code: '28237' },
  { sido: '인천', name: '계양구',  code: '28245' },
  { sido: '인천', name: '서구',    code: '28260' },
  { sido: '인천', name: '강화군',  code: '28710' },
  { sido: '인천', name: '옹진군',  code: '28720' },
  // 부산 (16)
  { sido: '부산', name: '중구',    code: '26110' },
  { sido: '부산', name: '서구',    code: '26140' },
  { sido: '부산', name: '동구',    code: '26170' },
  { sido: '부산', name: '영도구',  code: '26200' },
  { sido: '부산', name: '부산진구', code: '26230' },
  { sido: '부산', name: '동래구',  code: '26260' },
  { sido: '부산', name: '남구',    code: '26290' },
  { sido: '부산', name: '북구',    code: '26320' },
  { sido: '부산', name: '해운대구', code: '26350' },
  { sido: '부산', name: '사하구',  code: '26380' },
  { sido: '부산', name: '금정구',  code: '26410' },
  { sido: '부산', name: '강서구',  code: '26440' },
  { sido: '부산', name: '연제구',  code: '26470' },
  { sido: '부산', name: '수영구',  code: '26500' },
  { sido: '부산', name: '사상구',  code: '26530' },
  { sido: '부산', name: '기장군',  code: '26710' },
  // 대구 (9)
  { sido: '대구', name: '중구',    code: '27110' },
  { sido: '대구', name: '동구',    code: '27140' },
  { sido: '대구', name: '서구',    code: '27170' },
  { sido: '대구', name: '남구',    code: '27200' },
  { sido: '대구', name: '북구',    code: '27230' },
  { sido: '대구', name: '수성구',  code: '27260' },
  { sido: '대구', name: '달서구',  code: '27290' },
  { sido: '대구', name: '달성군',  code: '27710' },
  { sido: '대구', name: '군위군',  code: '27720' },
  // 광주 (5)
  { sido: '광주', name: '동구',    code: '29110' },
  { sido: '광주', name: '서구',    code: '29140' },
  { sido: '광주', name: '남구',    code: '29155' },
  { sido: '광주', name: '북구',    code: '29170' },
  { sido: '광주', name: '광산구',  code: '29200' },
  // 대전 (5)
  { sido: '대전', name: '동구',    code: '30110' },
  { sido: '대전', name: '중구',    code: '30140' },
  { sido: '대전', name: '서구',    code: '30170' },
  { sido: '대전', name: '유성구',  code: '30200' },
  { sido: '대전', name: '대덕구',  code: '30230' },
  // 울산 (5)
  { sido: '울산', name: '중구',    code: '31110' },
  { sido: '울산', name: '남구',    code: '31140' },
  { sido: '울산', name: '동구',    code: '31170' },
  { sido: '울산', name: '북구',    code: '31200' },
  { sido: '울산', name: '울주군',  code: '31710' },
  // 세종 (1)
  { sido: '세종', name: '세종시',  code: '36110' },
  // 강원 (18)
  { sido: '강원', name: '춘천시',  code: '51110' },
  { sido: '강원', name: '원주시',  code: '51130' },
  { sido: '강원', name: '강릉시',  code: '51150' },
  { sido: '강원', name: '동해시',  code: '51170' },
  { sido: '강원', name: '태백시',  code: '51190' },
  { sido: '강원', name: '속초시',  code: '51210' },
  { sido: '강원', name: '삼척시',  code: '51230' },
  { sido: '강원', name: '홍천군',  code: '51720' },
  { sido: '강원', name: '횡성군',  code: '51730' },
  { sido: '강원', name: '영월군',  code: '51750' },
  { sido: '강원', name: '평창군',  code: '51760' },
  { sido: '강원', name: '정선군',  code: '51770' },
  { sido: '강원', name: '철원군',  code: '51780' },
  { sido: '강원', name: '화천군',  code: '51790' },
  { sido: '강원', name: '양구군',  code: '51800' },
  { sido: '강원', name: '인제군',  code: '51810' },
  { sido: '강원', name: '고성군',  code: '51820' },
  { sido: '강원', name: '양양군',  code: '51830' },
  // 충북 (14)
  { sido: '충북', name: '청주 상당구', code: '43111' },
  { sido: '충북', name: '청주 서원구', code: '43112' },
  { sido: '충북', name: '청주 흥덕구', code: '43113' },
  { sido: '충북', name: '청주 청원구', code: '43114' },
  { sido: '충북', name: '충주시',     code: '43130' },
  { sido: '충북', name: '제천시',     code: '43150' },
  { sido: '충북', name: '보은군',     code: '43720' },
  { sido: '충북', name: '옥천군',     code: '43730' },
  { sido: '충북', name: '영동군',     code: '43740' },
  { sido: '충북', name: '증평군',     code: '43745' },
  { sido: '충북', name: '진천군',     code: '43750' },
  { sido: '충북', name: '괴산군',     code: '43760' },
  { sido: '충북', name: '음성군',     code: '43770' },
  { sido: '충북', name: '단양군',     code: '43800' },
  // 충남 (16)
  { sido: '충남', name: '천안 동남구', code: '44131' },
  { sido: '충남', name: '천안 서북구', code: '44133' },
  { sido: '충남', name: '공주시',     code: '44150' },
  { sido: '충남', name: '보령시',     code: '44180' },
  { sido: '충남', name: '아산시',     code: '44200' },
  { sido: '충남', name: '서산시',     code: '44210' },
  { sido: '충남', name: '논산시',     code: '44230' },
  { sido: '충남', name: '계룡시',     code: '44250' },
  { sido: '충남', name: '당진시',     code: '44270' },
  { sido: '충남', name: '금산군',     code: '44710' },
  { sido: '충남', name: '부여군',     code: '44760' },
  { sido: '충남', name: '서천군',     code: '44770' },
  { sido: '충남', name: '청양군',     code: '44790' },
  { sido: '충남', name: '홍성군',     code: '44800' },
  { sido: '충남', name: '예산군',     code: '44810' },
  { sido: '충남', name: '태안군',     code: '44825' },
  // 전북 (15)
  { sido: '전북', name: '전주 완산구', code: '52111' },
  { sido: '전북', name: '전주 덕진구', code: '52113' },
  { sido: '전북', name: '군산시',     code: '52130' },
  { sido: '전북', name: '익산시',     code: '52140' },
  { sido: '전북', name: '정읍시',     code: '52180' },
  { sido: '전북', name: '남원시',     code: '52190' },
  { sido: '전북', name: '김제시',     code: '52210' },
  { sido: '전북', name: '완주군',     code: '52710' },
  { sido: '전북', name: '진안군',     code: '52720' },
  { sido: '전북', name: '무주군',     code: '52730' },
  { sido: '전북', name: '장수군',     code: '52740' },
  { sido: '전북', name: '임실군',     code: '52750' },
  { sido: '전북', name: '순창군',     code: '52770' },
  { sido: '전북', name: '고창군',     code: '52790' },
  { sido: '전북', name: '부안군',     code: '52800' },
  // 전남 (22)
  { sido: '전남', name: '목포시',  code: '46110' },
  { sido: '전남', name: '여수시',  code: '46130' },
  { sido: '전남', name: '순천시',  code: '46150' },
  { sido: '전남', name: '나주시',  code: '46170' },
  { sido: '전남', name: '광양시',  code: '46230' },
  { sido: '전남', name: '담양군',  code: '46710' },
  { sido: '전남', name: '곡성군',  code: '46720' },
  { sido: '전남', name: '구례군',  code: '46730' },
  { sido: '전남', name: '고흥군',  code: '46770' },
  { sido: '전남', name: '보성군',  code: '46780' },
  { sido: '전남', name: '화순군',  code: '46790' },
  { sido: '전남', name: '장흥군',  code: '46800' },
  { sido: '전남', name: '강진군',  code: '46810' },
  { sido: '전남', name: '해남군',  code: '46820' },
  { sido: '전남', name: '영암군',  code: '46830' },
  { sido: '전남', name: '무안군',  code: '46840' },
  { sido: '전남', name: '함평군',  code: '46860' },
  { sido: '전남', name: '영광군',  code: '46870' },
  { sido: '전남', name: '장성군',  code: '46880' },
  { sido: '전남', name: '완도군',  code: '46890' },
  { sido: '전남', name: '진도군',  code: '46900' },
  { sido: '전남', name: '신안군',  code: '46910' },
  // 경북 (23)
  { sido: '경북', name: '포항 남구', code: '47111' },
  { sido: '경북', name: '포항 북구', code: '47113' },
  { sido: '경북', name: '경주시',   code: '47130' },
  { sido: '경북', name: '김천시',   code: '47150' },
  { sido: '경북', name: '안동시',   code: '47170' },
  { sido: '경북', name: '구미시',   code: '47190' },
  { sido: '경북', name: '영주시',   code: '47210' },
  { sido: '경북', name: '영천시',   code: '47220' },
  { sido: '경북', name: '상주시',   code: '47230' },
  { sido: '경북', name: '문경시',   code: '47250' },
  { sido: '경북', name: '경산시',   code: '47290' },
  { sido: '경북', name: '의성군',   code: '47730' },
  { sido: '경북', name: '청송군',   code: '47740' },
  { sido: '경북', name: '영양군',   code: '47760' },
  { sido: '경북', name: '영덕군',   code: '47770' },
  { sido: '경북', name: '청도군',   code: '47820' },
  { sido: '경북', name: '고령군',   code: '47830' },
  { sido: '경북', name: '성주군',   code: '47840' },
  { sido: '경북', name: '칠곡군',   code: '47850' },
  { sido: '경북', name: '예천군',   code: '47900' },
  { sido: '경북', name: '봉화군',   code: '47920' },
  { sido: '경북', name: '울진군',   code: '47930' },
  { sido: '경북', name: '울릉군',   code: '47940' },
  // 경남 (22)
  { sido: '경남', name: '창원 의창구',   code: '48121' },
  { sido: '경남', name: '창원 성산구',   code: '48123' },
  { sido: '경남', name: '창원 마산합포구', code: '48125' },
  { sido: '경남', name: '창원 마산회원구', code: '48127' },
  { sido: '경남', name: '창원 진해구',   code: '48129' },
  { sido: '경남', name: '진주시',       code: '48170' },
  { sido: '경남', name: '통영시',       code: '48220' },
  { sido: '경남', name: '사천시',       code: '48240' },
  { sido: '경남', name: '김해시',       code: '48250' },
  { sido: '경남', name: '밀양시',       code: '48270' },
  { sido: '경남', name: '거제시',       code: '48310' },
  { sido: '경남', name: '양산시',       code: '48330' },
  { sido: '경남', name: '의령군',       code: '48720' },
  { sido: '경남', name: '함안군',       code: '48730' },
  { sido: '경남', name: '창녕군',       code: '48740' },
  { sido: '경남', name: '고성군',       code: '48820' },
  { sido: '경남', name: '남해군',       code: '48840' },
  { sido: '경남', name: '하동군',       code: '48850' },
  { sido: '경남', name: '산청군',       code: '48860' },
  { sido: '경남', name: '함양군',       code: '48870' },
  { sido: '경남', name: '거창군',       code: '48880' },
  { sido: '경남', name: '합천군',       code: '48890' },
  // 제주 (2)
  { sido: '제주', name: '제주시',  code: '50110' },
  { sido: '제주', name: '서귀포시', code: '50130' },
];

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function yearMonth(date, offsetMonths = 0) {
  const d = new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function xmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function parseItems(xml, sido, gu) {
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const result = [];
  for (const block of blocks) {
    if (xmlVal(block, 'cdealType').trim().replace(/\s/g, '')) continue; // 해제 건 제외
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
  const currYm = yearMonth(now);
  const prevYm = yearMonth(now, -1);

  console.log(`\n📊 실거래 통계 집계 시작`);
  console.log(`  이번달: ${currYm}  전달: ${prevYm}`);
  console.log(`  전국 ${DISTRICTS.length}개 시군구\n`);

  const currTrades = [];
  const prevTrades = [];

  for (let i = 0; i < DISTRICTS.length; i++) {
    const { sido, name, code } = DISTRICTS[i];
    const pct = Math.round(((i + 1) / DISTRICTS.length) * 100);
    process.stdout.write(`\r[${String(pct).padStart(3)}%] ${sido} ${name}                     `);

    const [curr, prev] = await Promise.all([
      fetchDistrict(code, currYm, sido, name),
      fetchDistrict(code, prevYm, sido, name),
    ]);
    currTrades.push(...curr);
    prevTrades.push(...prev);
    await sleep(120);
  }
  process.stdout.write('\n');
  console.log(`\n✅ 수집 완료: 이번달 ${currTrades.length}건 / 전달 ${prevTrades.length}건`);

  // ── 급등/급락: (name + dong + areaBucket) 단위 평균가 비교 ───────────────────
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

  const currGroups = buildGroups(currTrades);
  const prevGroups = buildGroups(prevTrades);

  const changeList = [];
  for (const [k, { trades: cTrades, meta }] of currGroups) {
    if (cTrades.length < 3) continue;
    const pg = prevGroups.get(k);
    if (!pg || pg.trades.length < 2) continue;
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

  // ── 신고가: 단지별 이번달 최고가 거래 ──────────────────────────────────────────
  const priceMap = new Map();
  for (const t of currTrades) {
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

  // ── 거래량: 단지별 이번달 거래 건수 ────────────────────────────────────────────
  const volMap = new Map();
  for (const t of currTrades) {
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

  // ── Supabase 저장 (stat_date 기준 upsert) ────────────────────────────────────
  const statDate = now.toISOString().slice(0, 10);
  const payload = {
    stat_date:             statDate,
    current_month:         currYm,
    prev_month:            prevYm,
    rising,
    falling,
    top_price:             topPrice,
    top_volume:            topVolume,
    total_trades_current:  currTrades.length,
    total_trades_prev:     prevTrades.length,
  };

  const res = await fetch(`${SB_URL}/rest/v1/trade_stats?on_conflict=stat_date`, {
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
    process.exit(1);
  }

  console.log(`\n✅ 저장 완료 (${statDate})`);
  console.log(`  급등: ${rising.length}건 | 급락: ${falling.length}건`);
  console.log(`  신고가: ${topPrice.length}건 | 거래량: ${topVolume.length}건`);
  if (rising[0])   console.log(`  📈 급등 1위: ${rising[0].name} (${rising[0].location}) +${rising[0].changePct}%`);
  if (falling[0])  console.log(`  📉 급락 1위: ${falling[0].name} (${falling[0].location}) ${falling[0].changePct}%`);
  if (topPrice[0]) console.log(`  🏆 신고가 1위: ${topPrice[0].name} ${topPrice[0].price.toLocaleString()}만원`);
  if (topVolume[0])console.log(`  🔥 거래량 1위: ${topVolume[0].name} ${topVolume[0].count}건`);
}

main().catch(e => {
  console.error('❌ 스크립트 오류:', e);
  process.exit(1);
});
