/**
 * 청약홈 Open API (한국부동산원)
 * Base URL: https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1
 *
 * 엔드포인트:
 *  - getAPTLttotPblancDetail          APT 분양정보 상세조회
 *  - getUrbtyOfctlLttotPblancDetail   오피스텔/도시형/민간임대/생활숙박시설
 *  - getRemndrLttotPblancDetail       APT 잔여세대(선착순) 분양정보
 *  - getPblPvtRentLttotPblancDetail   공공지원 민간임대
 *  - getOPTLttotPblancDetail          임의공급(무순위) 분양정보
 *  - getAPTLttotPblancMdl             APT 주택형별 상세
 *  - getUrbtyOfctlLttotPblancMdl      오피스텔/도시형 주택형별 상세
 *  - getRemndrLttotPblancMdl          APT 잔여세대 주택형별 상세
 *  - getPblPvtRentLttotPblancMdl      공공지원 민간임대 주택형별 상세
 *  - getOPTLttotPblancMdl             임의공급 주택형별 상세
 */

const BASE_URL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

export interface PublicSaleItem {
  id: string;
  houseManageNo: string;
  pblancNo: string;
  name: string;
  location: string;
  region: string;
  district: string;
  buildingType: '아파트' | '오피스텔' | '도시형생활주택' | '상업시설';
  supplyType: '민간분양' | '공공분양' | '공공지원민간임대' | '임대';
  recruitType: '신규공급' | '선착순';
  totalUnits: number;
  receiptStart: string;
  receiptEnd: string;
  announcementDate: string;
  winnerDate: string;
  contractStart: string;
  contractEnd: string;
  moveInDate: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  lat: number;
  lng: number;
  floors: number;
  constructionCompany: string;
  contact: string;
  units: UnitDetail[];
  pblancUrl: string;
}

export interface UnitDetail {
  type: string;
  area: number;
  count: number;
  price: number;
}

// ─── 날짜 포맷 헬퍼 ─────────────────────────────────────────────────────────

function fmtDate(d: string | undefined): string {
  if (!d) return '';
  // 이미 YYYY-MM-DD 형태인 경우
  if (d.includes('-') && d.length >= 10) return d.slice(0, 10);
  // YYYYMMDD 형태
  if (d.length < 8) return '';
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function fmtYearMonth(ym: string | undefined): string {
  if (!ym) return '';
  // 이미 YYYY-MM 또는 YYYY-MM-DD 형태인 경우
  if (ym.includes('-')) return ym.length >= 10 ? ym.slice(0, 10) : `${ym.slice(0, 7)}-01`;
  // YYYYMM 형태
  if (ym.length < 6) return '';
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
}

function calcStatus(
  receiptStart: string,
  receiptEnd: string,
  winnerDate: string,
  recruitType: '신규공급' | '선착순'
): string {
  if (recruitType === '선착순') return '선착순분양';
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const s = receiptStart.replace(/-/g, '');
  const e = receiptEnd.replace(/-/g, '');
  const w = winnerDate.replace(/-/g, '');
  if (!s) return '청약예정';
  if (today < s) return '청약예정';
  if (today >= s && today <= e) return '청약중';
  if (today > e && w && today > w) return '완판';
  if (today > e && today <= w) return '당첨발표';
  return '당첨발표';
}

function extractRegion(address: string): string {
  const regions = [
    '서울', '경기', '인천', '부산', '대구', '광주', '대전',
    '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  ];
  for (const r of regions) {
    if (address.includes(r)) return r;
  }
  return '기타';
}

function extractDistrict(address: string): string {
  const match = address.match(/(?:특별시|광역시|특별자치시|도)\s+(\S+[시군구])/);
  return match ? match[1] : '';
}

function mapBuildingType(secd: string): '아파트' | '오피스텔' | '도시형생활주택' | '상업시설' {
  if (secd.includes('오피스텔')) return '오피스텔';
  if (secd.includes('도시형')) return '도시형생활주택';
  if (secd.includes('생활숙박') || secd.includes('상업')) return '상업시설';
  return '아파트';
}

function mapSupplyType(secd: string): '민간분양' | '공공분양' | '임대' {
  if (secd.includes('공공')) return '공공분양';
  if (secd.includes('임대')) return '임대';
  return '민간분양';
}

// ─── 공통 fetch ──────────────────────────────────────────────────────────────

async function callApi(
  endpoint: string,
  serviceKey: string,
  page: number,
  perPage: number,
  extra?: Record<string, string>
): Promise<{ data: any[]; totalCount: number }> {
  // cond[...] 파라미터는 URLSearchParams가 대괄호/콜론을 인코딩하므로
  // 수동으로 쿼리스트링을 구성해야 API가 필터를 인식함
  let qs = `serviceKey=${encodeURIComponent(serviceKey)}&page=${page}&perPage=${perPage}`;
  if (extra) {
    // 키는 그대로(대괄호/콜론 유지), 값만 인코딩
    Object.entries(extra).forEach(([k, v]) => {
      qs += `&${k}=${encodeURIComponent(v)}`;
    });
  }
  const fullUrl = `${BASE_URL}/${endpoint}?${qs}`;

  const res = await fetch(fullUrl, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',  // 항상 최신 데이터 (캐시 없음)
  });

  if (!res.ok) throw new Error(`청약홈 API 오류 [${endpoint}]: ${res.status}`);

  const json = await res.json();
  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}

// page 1 (오래된 항목) + 마지막 페이지 (최신 항목) 를 병합해서 반환
// → API가 정렬을 지원하지 않아서 최신 항목이 항상 마지막 페이지에 있음
async function callApiWithLatest(
  endpoint: string,
  serviceKey: string,
  perPage: number,
  extra?: Record<string, string>
): Promise<{ data: any[]; totalCount: number }> {
  const first = await callApi(endpoint, serviceKey, 1, perPage, extra);
  if (first.totalCount <= perPage) return first;

  const lastPage = Math.ceil(first.totalCount / perPage);
  const last = await callApi(endpoint, serviceKey, lastPage, perPage, extra);

  const seen = new Set(first.data.map((d: any) => d.HOUSE_MANAGE_NO ?? d.PBLANC_NO));
  const newItems = last.data.filter((d: any) => !seen.has(d.HOUSE_MANAGE_NO ?? d.PBLANC_NO));

  return { data: [...first.data, ...newItems], totalCount: first.totalCount };
}

// ─── 파서: 상세조회 ──────────────────────────────────────────────────────────

function parseDetail(raw: any, recruitType: '신규공급' | '선착순', supplyTypeOverride?: PublicSaleItem['supplyType']): PublicSaleItem {
  // 청약홈 API 엔드포인트마다 필드명이 다를 수 있어 폴백 처리
  // 잔여세대(getRemndrLttotPblancDetail) / 임의공급(getOPTLttotPblancDetail) 은
  // GNRL_RCEPT_BGNDE / SPSPLY_RCEPT_BGNDE 를 사용하는 경우가 있음
  const receiptStart = fmtDate(
    raw.RCEPT_BGNDE || raw.GNRL_RCEPT_BGNDE || raw.SPSPLY_RCEPT_BGNDE
  );
  const receiptEnd = fmtDate(
    raw.RCEPT_ENDDE || raw.GNRL_RCEPT_ENDDE || raw.SPSPLY_RCEPT_ENDDE
  );
  const winnerDate   = fmtDate(raw.PRZWNER_PRESNATN_DE);
  const location     = raw.HSSPLY_ADRES ?? '';
  const secdNm       = raw.HOUSE_SECD_NM ?? '';

  return {
    id:              raw.HOUSE_MANAGE_NO ?? String(Math.random()),
    houseManageNo:   raw.HOUSE_MANAGE_NO ?? '',
    pblancNo:        raw.PBLANC_NO ?? '',
    name:            raw.HOUSE_NM ?? '단지명 미상',
    location,
    region:          extractRegion(location),
    district:        extractDistrict(location),
    buildingType:    mapBuildingType(secdNm),
    supplyType:      supplyTypeOverride ?? mapSupplyType(secdNm),
    recruitType,
    totalUnits:      parseInt(raw.TOT_SUPLY_HSHLDCO ?? '0') || 0,
    receiptStart,
    receiptEnd,
    announcementDate: fmtDate(raw.RCRIT_PBLANC_DE),
    winnerDate,
    contractStart:   fmtDate(raw.CNTRCT_CNCLS_BGNDE || raw.CNTRCT_BGNDE),
    contractEnd:     fmtDate(raw.CNTRCT_CNCLS_ENDDE || raw.CNTRCT_ENDDE),
    moveInDate:      fmtYearMonth(raw.MVN_PREARNGE_YM),
    status:          calcStatus(receiptStart, receiptEnd, winnerDate, recruitType),
    minPrice:        0,
    maxPrice:        0,
    lat:             37.5665,
    lng:             126.9780,
    floors:          0,
    constructionCompany: raw.CNSTRCTN_CMPNY_NM ?? '',
    contact:         raw.MDHS_TELNO ?? '',
    units:           [],
    pblancUrl:       raw.PBLANC_URL ?? '',
  };
}

// ─── 파서: 주택형별 ───────────────────────────────────────────────────────────

function parseUnit(raw: any): UnitDetail {
  // APT API: HOUSE_TY, SUPLY_AR, LTTOT_TOP_AMOUNT
  // 오피스텔 API: TP, EXCLUSE_AR, SUPLY_AMOUNT
  const priceRaw = (raw.LTTOT_TOP_AMOUNT ?? raw.SUPLY_AMOUNT ?? '0').toString().replace(/,/g, '');
  return {
    type:  raw.HOUSE_TY ?? raw.TP ?? '',
    area:  parseFloat(raw.EXCLUSE_AR ?? raw.HOUSE_TY ?? raw.TP ?? '0') || 0,
    count: parseInt(raw.SUPLY_HSHLDCO ?? '0') || 0,
    price: parseInt(priceRaw) || 0,
  };
}

// ─── 공개 함수들 ─────────────────────────────────────────────────────────────

type DateFilter = { dateFrom?: string; dateTo?: string };

function buildDateCond(df: DateFilter): Record<string, string> {
  const cond: Record<string, string> = {};
  // 모집공고일(RCRIT_PBLANC_DE) 기준 필터 — 오늘 공고된 항목도 포함
  if (df.dateFrom) cond['cond[RCRIT_PBLANC_DE::GTE]'] = df.dateFrom.replace(/-/g, '');
  if (df.dateTo)   cond['cond[RCRIT_PBLANC_DE::LTE]'] = df.dateTo.replace(/-/g, '');
  return cond;
}

// 공고일(없으면 접수시작일) 기준 내림차순 정렬 — 빈 날짜 항목도 포함
function sortByAnnouncementDesc(items: PublicSaleItem[], limit: number): PublicSaleItem[] {
  return items
    .sort((a, b) => {
      const da = a.announcementDate || a.receiptStart || '';
      const db = b.announcementDate || b.receiptStart || '';
      return db.localeCompare(da);
    })
    .slice(0, limit);
}

/**
 * APT 분양정보 목록 조회
 */
export async function fetchAPTSaleList(
  serviceKey: string,
  _page = 1,
  perPage = 10,
  df: DateFilter = {}
): Promise<{ items: PublicSaleItem[]; total: number }> {
  const { data, totalCount } = await callApiWithLatest(
    'getAPTLttotPblancDetail', serviceKey, Math.min(perPage * 2, 100), buildDateCond(df)
  );
  const items = sortByAnnouncementDesc(data.map(d => parseDetail(d, '신규공급')), perPage);
  return { items, total: totalCount };
}

/**
 * 오피스텔/도시형/민간임대/생활숙박 분양정보 목록 조회
 */
export async function fetchOfficetelSaleList(
  serviceKey: string,
  _page = 1,
  perPage = 10,
  df: DateFilter = {}
): Promise<{ items: PublicSaleItem[]; total: number }> {
  const { data, totalCount } = await callApiWithLatest(
    'getUrbtyOfctlLttotPblancDetail', serviceKey, Math.min(perPage * 2, 100), buildDateCond(df)
  );
  const items = sortByAnnouncementDesc(data.map(d => parseDetail(d, '신규공급')), perPage);
  return { items, total: totalCount };
}

/**
 * APT 잔여세대(선착순) 분양정보 목록 조회
 */
export async function fetchRemndrSaleList(
  serviceKey: string,
  _page = 1,
  perPage = 10,
  df: DateFilter = {}
): Promise<{ items: PublicSaleItem[]; total: number }> {
  const { data, totalCount } = await callApiWithLatest(
    'getRemndrLttotPblancDetail', serviceKey, Math.min(perPage * 2, 100), buildDateCond(df)
  );
  const items = sortByAnnouncementDesc(data.map(d => parseDetail(d, '선착순')), perPage);
  return { items, total: totalCount };
}

/**
 * 공공지원 민간임대 분양정보 목록 조회
 */
export async function fetchPblPvtRentSaleList(
  serviceKey: string,
  _page = 1,
  perPage = 10,
  df: DateFilter = {}
): Promise<{ items: PublicSaleItem[]; total: number }> {
  const { data, totalCount } = await callApiWithLatest(
    'getPblPvtRentLttotPblancDetail', serviceKey, Math.min(perPage * 2, 100), buildDateCond(df)
  );
  const items = sortByAnnouncementDesc(data.map(d => parseDetail(d, '신규공급', '공공지원민간임대')), perPage);
  return { items, total: totalCount };
}

/**
 * 임의공급(무순위) 분양정보 목록 조회
 */
export async function fetchOptSaleList(
  serviceKey: string,
  _page = 1,
  perPage = 10,
  df: DateFilter = {}
): Promise<{ items: PublicSaleItem[]; total: number }> {
  const { data, totalCount } = await callApiWithLatest(
    'getOPTLttotPblancDetail', serviceKey, Math.min(perPage * 2, 100), buildDateCond(df)
  );
  const items = sortByAnnouncementDesc(data.map(d => parseDetail(d, '선착순')), perPage);
  return { items, total: totalCount };
}

/**
 * APT 주택형별 상세 조회
 */
export async function fetchAPTUnits(
  serviceKey: string,
  houseManageNo: string,
  pblancNo: string
): Promise<UnitDetail[]> {
  const { data } = await callApi('getAPTLttotPblancMdl', serviceKey, 1, 50, {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  });
  return data.map(parseUnit);
}

/**
 * 오피스텔/도시형 주택형별 상세 조회
 */
export async function fetchOfficetelUnits(
  serviceKey: string,
  houseManageNo: string,
  pblancNo: string
): Promise<UnitDetail[]> {
  const { data } = await callApi('getUrbtyOfctlLttotPblancMdl', serviceKey, 1, 50, {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  });
  return data.map(parseUnit);
}

/**
 * APT 잔여세대 주택형별 상세 조회
 */
export async function fetchRemndrUnits(
  serviceKey: string,
  houseManageNo: string,
  pblancNo: string
): Promise<UnitDetail[]> {
  const { data } = await callApi('getRemndrLttotPblancMdl', serviceKey, 1, 50, {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  });
  return data.map(parseUnit);
}

/**
 * 공공지원 민간임대 주택형별 상세 조회
 */
export async function fetchPblPvtRentUnits(
  serviceKey: string,
  houseManageNo: string,
  pblancNo: string
): Promise<UnitDetail[]> {
  const { data } = await callApi('getPblPvtRentLttotPblancMdl', serviceKey, 1, 50, {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  });
  return data.map(parseUnit);
}

/**
 * 임의공급 주택형별 상세 조회
 */
export async function fetchOptUnits(
  serviceKey: string,
  houseManageNo: string,
  pblancNo: string
): Promise<UnitDetail[]> {
  const { data } = await callApi('getOPTLttotPblancMdl', serviceKey, 1, 50, {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  });
  return data.map(parseUnit);
}

// ─── 가격 보강 ────────────────────────────────────────────────────────────────

/**
 * 목록 아이템들에 대해 유닛별 가격을 병렬로 조회하여 minPrice/maxPrice 설정
 */
async function enrichWithPrices(items: PublicSaleItem[]): Promise<PublicSaleItem[]> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        const units = await fetchUnitDetails(item.houseManageNo, item.pblancNo, item.buildingType, item.recruitType);
        const prices = units.map(u => u.price).filter(p => p > 0);
        return {
          ...item,
          units,
          minPrice: prices.length > 0 ? Math.min(...prices) : 0,
          maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        };
      } catch {
        return item;
      }
    })
  );
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : items[i]);
}

// ─── 통합 조회 ────────────────────────────────────────────────────────────────

export type FetchType = 'apt' | 'officetel' | 'remndr' | 'pblpvtrent' | 'opt' | 'all';

/**
 * 전체 분양정보 통합 조회
 * type: 'all' 이면 APT + 오피스텔 + 잔여세대 동시 요청
 */
export async function fetchPublicSaleList(params?: {
  type?: FetchType;
  page?: number;
  perPage?: number;
  dateFrom?: string;
  dateTo?: string;
  skipEnrich?: boolean;
}): Promise<{ items: PublicSaleItem[]; total: number }> {
  const serviceKey = process.env.PUBLIC_DATA_API_KEY;
  if (!serviceKey) throw new Error('PUBLIC_DATA_API_KEY가 설정되지 않았습니다.');

  const page        = params?.page        ?? 1;
  const perPage     = params?.perPage     ?? 10;
  const type        = params?.type        ?? 'all';
  const skipEnrich  = params?.skipEnrich  ?? true;   // 목록에서는 가격 enrichment 생략

  // 날짜 필터는 명시적으로 전달된 경우만 적용
  // (기본값 없음 — callApiWithLatest가 첫 페이지+마지막 페이지를 병합해 최신 데이터 확보)
  const recentDf: DateFilter = {
    dateFrom: params?.dateFrom,
    dateTo:   params?.dateTo,
  };

  if (type === 'all') {
    // 각 타입에서 동등하게 가져온 뒤 공고일 기준 통합 정렬
    const sub = Math.ceil(perPage / 5);  // 5개 타입으로 균등 분배
    const [apt, ofcl, remndr, pblpvt, opt] = await Promise.allSettled([
      fetchAPTSaleList(serviceKey, page, sub, recentDf),
      fetchOfficetelSaleList(serviceKey, page, sub, recentDf),
      fetchRemndrSaleList(serviceKey, page, sub, recentDf),
      fetchPblPvtRentSaleList(serviceKey, page, sub, recentDf),
      fetchOptSaleList(serviceKey, page, sub, recentDf),
    ]);

    const items: PublicSaleItem[] = [];
    let total = 0;

    if (apt.status === 'fulfilled') { items.push(...apt.value.items); total += apt.value.total; }
    if (ofcl.status === 'fulfilled') { items.push(...ofcl.value.items); total += ofcl.value.total; }
    if (remndr.status === 'fulfilled') { items.push(...remndr.value.items); total += remndr.value.total; }
    if (pblpvt.status === 'fulfilled') { items.push(...pblpvt.value.items); total += pblpvt.value.total; }
    if (opt.status === 'fulfilled') { items.push(...opt.value.items); total += opt.value.total; }

    // 통합 후 공고일 내림차순 재정렬
    items.sort((a, b) => {
      const da = a.announcementDate || a.receiptStart || '';
      const db = b.announcementDate || b.receiptStart || '';
      return db.localeCompare(da);
    });

    if (skipEnrich) return { items, total };
    return { items: await enrichWithPrices(items), total };
  }

  const maybeEnrich = async (r: { items: PublicSaleItem[]; total: number }) =>
    skipEnrich ? r : { ...r, items: await enrichWithPrices(r.items) };

  switch (type) {
    case 'apt':        return maybeEnrich(await fetchAPTSaleList(serviceKey, page, perPage, recentDf));
    case 'officetel':  return maybeEnrich(await fetchOfficetelSaleList(serviceKey, page, perPage, recentDf));
    case 'remndr':     return maybeEnrich(await fetchRemndrSaleList(serviceKey, page, perPage, recentDf));
    case 'pblpvtrent': return maybeEnrich(await fetchPblPvtRentSaleList(serviceKey, page, perPage, recentDf));
    case 'opt':        return maybeEnrich(await fetchOptSaleList(serviceKey, page, perPage, recentDf));
    default:           return maybeEnrich(await fetchAPTSaleList(serviceKey, page, perPage, recentDf));
  }
}

/**
 * HOUSE_MANAGE_NO로 단일 분양 항목 조회
 * APT → 오피스텔 → 잔여세대 순으로 검색
 */
export async function fetchSaleDetail(houseManageNo: string): Promise<PublicSaleItem | null> {
  const serviceKey = process.env.PUBLIC_DATA_API_KEY;
  if (!serviceKey) return null;

  const cond = { 'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo };

  const [apt, ofcl, remndr, pblpvt, opt] = await Promise.allSettled([
    callApi('getAPTLttotPblancDetail', serviceKey, 1, 1, cond),
    callApi('getUrbtyOfctlLttotPblancDetail', serviceKey, 1, 1, cond),
    callApi('getRemndrLttotPblancDetail', serviceKey, 1, 1, cond),
    callApi('getPblPvtRentLttotPblancDetail', serviceKey, 1, 1, cond),
    callApi('getOPTLttotPblancDetail', serviceKey, 1, 1, cond),
  ]);

  const results = [
    { result: apt, recruitType: '신규공급' as const },
    { result: ofcl, recruitType: '신규공급' as const },
    { result: remndr, recruitType: '선착순' as const },
    { result: pblpvt, recruitType: '신규공급' as const },
    { result: opt, recruitType: '선착순' as const },
  ];

  for (const { result, recruitType } of results) {
    if (result.status === 'fulfilled' && result.value.data.length > 0) {
      const item = parseDetail(result.value.data[0], recruitType);
      // 주택형별 상세도 함께 조회
      item.units = await fetchUnitDetails(item.houseManageNo, item.pblancNo, item.buildingType, item.recruitType);
      return item;
    }
  }

  return null;
}

/**
 * 특정 단지의 주택형별 상세 조회
 * buildingType에 따라 올바른 엔드포인트 선택
 */
export async function fetchUnitDetails(
  houseManageNo: string,
  pblancNo: string,
  buildingType: string,
  recruitType: string
): Promise<UnitDetail[]> {
  const serviceKey = process.env.PUBLIC_DATA_API_KEY;
  if (!serviceKey) return [];

  try {
    // 오피스텔/도시형
    if (buildingType === '오피스텔' || buildingType === '도시형생활주택') {
      return await fetchOfficetelUnits(serviceKey, houseManageNo, pblancNo);
    }

    if (recruitType === '선착순') {
      // 잔여세대 먼저 시도 → 없으면 임의공급(OPT) 시도
      const remndr = await fetchRemndrUnits(serviceKey, houseManageNo, pblancNo);
      if (remndr.length > 0) return remndr;
      return await fetchOptUnits(serviceKey, houseManageNo, pblancNo);
    }

    // 신규공급: APT 먼저 → 없으면 공공지원민간임대 시도
    const apt = await fetchAPTUnits(serviceKey, houseManageNo, pblancNo);
    if (apt.length > 0) return apt;
    return await fetchPblPvtRentUnits(serviceKey, houseManageNo, pblancNo);
  } catch {
    return [];
  }
}
