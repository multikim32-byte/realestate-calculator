/**
 * 국토교통부 아파트매매 실거래 상세 자료 API
 * https://apis.data.go.kr/1613000/RTMSOBJSvc/getRTMSDataSvcAptTradeDev
 *
 * 파라미터:
 *  - LAWD_CD  : 5자리 법정동 코드 (시/군/구)
 *  - DEAL_YMD : 거래년월 (YYYYMM)
 *  - pageNo   : 페이지 번호
 *  - numOfRows: 페이지당 행수
 */

const TRADE_URL =
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

export interface TradeItem {
  name: string;       // 아파트명
  dong: string;       // 법정동
  area: number;       // 전용면적 (㎡)
  floor: number;      // 층
  price: number;      // 거래금액 (만원)
  builtYear: number;  // 건축년도
  dealDate: string;   // YYYY-MM-DD
  dealType: string;   // 거래유형 (중개거래 등)
}

// ─── XML 파서 ────────────────────────────────────────────────────────────────

function xmlVal(xml: string, tag: string): string {
  // 한글 태그명 포함 지원
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function parseItems(xml: string): TradeItem[] {
  const items: TradeItem[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of blocks) {
    // 해제 건 제외 (cdealType이 공백이 아닌 경우)
    const cdealType = xmlVal(block, 'cdealType').trim();
    if (cdealType && cdealType !== ' ') continue;

    const priceRaw = xmlVal(block, 'dealAmount').replace(/,/g, '').replace(/\s/g, '');
    const price = parseInt(priceRaw) || 0;
    if (price === 0) continue;

    const year  = xmlVal(block, 'dealYear');
    const month = xmlVal(block, 'dealMonth').padStart(2, '0');
    const day   = xmlVal(block, 'dealDay').padStart(2, '0');

    items.push({
      name:      xmlVal(block, 'aptNm'),
      dong:      xmlVal(block, 'umdNm'),
      area:      parseFloat(xmlVal(block, 'excluUseAr')) || 0,
      floor:     parseInt(xmlVal(block, 'floor')) || 0,
      price,
      builtYear: parseInt(xmlVal(block, 'buildYear')) || 0,
      dealDate:  year && month && day ? `${year}-${month}-${day}` : '',
      dealType:  xmlVal(block, 'dealingGbn'),
    });
  }

  return items;
}

function parseTotalCount(xml: string): number {
  return parseInt(xmlVal(xml, 'totalCount')) || 0;
}

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

export async function fetchTradeList(
  lawdCd: string,
  dealYmd: string,
  page = 1,
  numOfRows = 100,
): Promise<{ items: TradeItem[]; total: number }> {
  const key = process.env.MOLIT_API_KEY?.trim();
  if (!key) throw new Error('MOLIT_API_KEY가 설정되지 않았습니다.');

  // data.go.kr 키는 포털에서 이미 인코딩된 값이므로 추가 인코딩 없이 그대로 사용
  const qs = `serviceKey=${key}&pageNo=${page}&numOfRows=${numOfRows}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;
  const url = `${TRADE_URL}?${qs}`;

  const res = await fetch(url, { cache: 'no-store' });
  const xml = await res.text();

  if (!res.ok) {
    // 응답 본문에 오류 내용 포함
    const errDetail = xml.slice(0, 300);
    throw new Error(`국토부 API ${res.status}: ${errDetail}`);
  }

  // 오류 응답 체크 (200이어도 XML에 오류코드가 올 수 있음)
  if (xml.includes('<errMsg>') || xml.includes('SERVICE_KEY') || xml.includes('<returnReasonCode>')) {
    const msg = xmlVal(xml, 'errMsg') || xmlVal(xml, 'returnAuthMsg') || xmlVal(xml, 'returnReasonCode') || xml.slice(0, 200);
    throw new Error(`국토부 API 인증오류: ${msg}`);
  }

  return {
    items: parseItems(xml),
    total: parseTotalCount(xml),
  };
}

// ─── 지역 코드 매핑 ──────────────────────────────────────────────────────────

export type SidoName = keyof typeof LAWD_CODE_MAP;

export const LAWD_CODE_MAP = {
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
    { name: '김포시', code: '41570' },
    { name: '화성특례시', code: '41590' }, { name: '화성시', code: '41590' },
    { name: '화성 남양·향남권', code: '41591' }, { name: '화성 봉담권', code: '41593' },
    { name: '화성 병점·반월권', code: '41595' },
    { name: '광주시', code: '41610' }, { name: '양주시', code: '41630' },
    { name: '포천시', code: '41650' }, { name: '여주시', code: '41670' },
    { name: '연천군', code: '41800' }, { name: '가평군', code: '41820' },
    { name: '양평군', code: '41830' }, { name: '의정부시', code: '41150' },
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
  '세종': [
    { name: '세종시', code: '36110' },
  ],
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
} as const;

// 최근 N개월 목록 생성 (YYYYMM 형식)
export function recentMonths(n = 6): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    result.push({ label: `${y}년 ${d.getMonth() + 1}월`, value: `${y}${m}` });
  }
  return result;
}
