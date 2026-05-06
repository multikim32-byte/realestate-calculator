/**
 * 한국토지주택공사(LH) 분양임대공고 API
 * Base URL: https://apis.data.go.kr/B552555
 *
 * 엔드포인트:
 *  - lhLeaseNoticeInfo1/lhLeaseNoticeInfo1         분양임대공고문 목록 조회 (지역/유형/상태 필터)
 *  - lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1  공고별 상세정보 (접수처, 단지, 일정)
 *  - lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1  공고별 공급정보 (주택형 목록)
 *
 * 응답 형태: LH 데이터셋 포맷 (배열 of named datasets)
 *  [{dsSch:[...]}, {dsList:[...]}, {resHeader:[...]}]
 */

const BASE_URL = 'https://apis.data.go.kr/B552555';

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

type RawItem = Record<string, string | undefined>;

export interface LhRentalItem {
  id: string;
  ccrCnt: string;
  name: string;
  rentalType: string;
  region: string;
  location: string;
  totalUnits: number;
  announcementDate: string;
  receiptStart: string;
  receiptEnd: string;
  winnerDate: string;
  contractStart: string;
  contractEnd: string;
  moveInDate: string;
  status: string;
  pblancUrl: string;
  contact: string;
  // 상세/공급 API 호출에 필요한 파라미터
  ccrCnntSysDsCd: string;
  uppAisTpCd: string;
  aisTpCd: string;
  splInfTpCd: string;
}

export interface LhAttachment {
  name: string;
  url: string;
  type: 'hwp' | 'pdf' | 'etc';
}

export interface LhSupplyUnit {
  houseType: string;
  supplyType: string;
  count: number;
  deposit: number;
  monthlyRent: number;
}

// ─── 날짜 헬퍼 ───────────────────────────────────────────────────────────────

function fmtDate(d: string | undefined): string {
  if (!d) return '';
  if (d.includes('-')) return d.slice(0, 10);
  // YYYY.MM.DD 형태
  if (d.includes('.') && d.length >= 10) return d.slice(0, 10).replace(/\./g, '-');
  if (d.length < 8) return '';
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function fmtYearMonth(ym: string | undefined): string {
  if (!ym) return '';
  if (ym.includes('-')) return ym.length >= 10 ? ym.slice(0, 10) : `${ym.slice(0, 7)}-01`;
  if (ym.length < 6) return '';
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
}

function mapStatus(panSs: string | undefined): string {
  if (!panSs) return '모집예정';
  if (panSs.includes('중') || panSs === '공고중') return '모집중';
  if (panSs.includes('예정') || panSs === '공고예정') return '모집예정';
  return '모집마감';
}

// 전체 지역명 → 약칭
const REGION_FULL_MAP: Record<string, string> = {
  '서울특별시': '서울', '서울': '서울',
  '경기도': '경기', '경기': '경기',
  '인천광역시': '인천', '인천': '인천',
  '부산광역시': '부산', '부산': '부산',
  '대구광역시': '대구', '대구': '대구',
  '광주광역시': '광주', '광주': '광주',
  '대전광역시': '대전', '대전': '대전',
  '울산광역시': '울산', '울산': '울산',
  '세종특별자치시': '세종', '세종': '세종',
  '강원특별자치도': '강원', '강원도': '강원', '강원': '강원',
  '충청북도': '충북', '충북': '충북',
  '충청남도': '충남', '충남': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전북': '전북',
  '전라남도': '전남', '전남': '전남',
  '경상북도': '경북', '경북': '경북',
  '경상남도': '경남', '경남': '경남',
  '제주특별자치도': '제주', '제주': '제주',
};

function normalizeRegion(raw: string | undefined): string {
  if (!raw) return '기타';
  // 정확히 일치하는 전체명 먼저 시도
  for (const [full, abbr] of Object.entries(REGION_FULL_MAP)) {
    if (raw === full || raw.startsWith(full)) return abbr;
  }
  // 포함 여부로 폴백
  for (const [full, abbr] of Object.entries(REGION_FULL_MAP)) {
    if (raw.includes(full)) return abbr;
  }
  return '기타';
}

// ─── 파서 ────────────────────────────────────────────────────────────────────

// lhLeaseNoticeInfo1 목록 API 파서
function parseListItem(raw: RawItem): LhRentalItem {
  const announcementDate = fmtDate(raw.PAN_NT_ST_DT ?? raw.PAN_DT);
  const closeDate        = fmtDate(raw.CLSG_DT);

  return {
    id:               raw.PAN_ID ?? String(Math.random()),
    ccrCnt:           raw.PAN_ID ?? '',
    name:             raw.PAN_NM ?? '공고명 미상',
    rentalType:       raw.AIS_TP_CD_NM ?? '임대',
    region:           normalizeRegion(raw.CNP_CD_NM),
    location:         raw.CNP_CD_NM ?? '',
    totalUnits:       0,
    announcementDate,
    receiptStart:     announcementDate,
    receiptEnd:       closeDate,
    winnerDate:       '',
    contractStart:    '',
    contractEnd:      '',
    moveInDate:       '',
    status:           mapStatus(raw.PAN_SS),
    pblancUrl:        raw.DTL_URL ?? '',
    contact:          '',
    ccrCnntSysDsCd:   raw.CCR_CNNT_SYS_DS_CD ?? '03',
    uppAisTpCd:       raw.UPP_AIS_TP_CD ?? '',
    aisTpCd:          raw.AIS_TP_CD ?? '',
    splInfTpCd:       raw.SPL_INF_TP_CD ?? '010',
  };
}

// lhLeaseNoticeDtlInfo1 상세 API 파서 (detail 페이지용)
function parseItem(raw: RawItem): LhRentalItem {
  const receiptStart = fmtDate(raw.SUBSCRPT_RCEPT_BGNDE ?? raw.RCEPT_BGNDE);
  const receiptEnd   = fmtDate(raw.SUBSCRPT_RCEPT_ENDDE ?? raw.RCEPT_ENDDE);
  const uppAisTpCd   = raw.UPP_AIS_TP_CD ?? '';

  return {
    id:               raw.CCR_CNT ?? raw.PAN_ID ?? String(Math.random()),
    ccrCnt:           raw.CCR_CNT ?? raw.PAN_ID ?? '',
    name:             raw.ANN_MN_NM ?? raw.PAN_NM ?? '공고명 미상',
    rentalType:       raw.AIS_TP_CD_NM ?? '임대',
    region:           normalizeRegion(raw.CNP_CD_NM ?? raw.HSSPLY_ADRES),
    location:         raw.HSSPLY_ADRES ?? raw.CNP_CD_NM ?? '',
    totalUnits:       parseInt(raw.TOT_SUPLY_HSHLDCO ?? '0') || 0,
    announcementDate: fmtDate(raw.RCRIT_PBLANC_DE ?? raw.PAN_DT),
    receiptStart,
    receiptEnd,
    winnerDate:       fmtDate(raw.PRZWNER_PRESNATN_DE),
    contractStart:    fmtDate(raw.CNTRCT_CNCLS_BGNDE ?? raw.CNTRCT_BGNDE),
    contractEnd:      fmtDate(raw.CNTRCT_CNCLS_ENDDE ?? raw.CNTRCT_ENDDE),
    moveInDate:       fmtYearMonth(raw.MVN_PREARNGE_YM),
    status:           mapStatus(raw.PAN_SS),
    pblancUrl:        raw.DTL_URL ?? raw.PBLANC_URL ?? '',
    contact:          raw.MDHS_TELNO ?? '',
    ccrCnntSysDsCd:   raw.CCR_CNNT_SYS_DS_CD ?? '03',
    uppAisTpCd,
    aisTpCd:          raw.AIS_TP_CD ?? '',
    splInfTpCd:       raw.SPL_INF_TP_CD ?? (uppAisTpCd === '05' ? '050' : uppAisTpCd === '39' ? '390' : '060'),
  };
}

// ─── 공통 fetch ──────────────────────────────────────────────────────────────

async function callLhApi(
  service: string,
  endpoint: string,
  serviceKey: string,
  pageNo: number,
  numOfRows: number,
  extra?: Record<string, string>
): Promise<{ items: RawItem[]; totalCount: number; raw?: unknown }> {
  // lhLeaseNoticeInfo1 은 PG_SZ / PAGE, 나머지 LH API는 numOfRows / pageNo 사용
  const isListApi = service === 'lhLeaseNoticeInfo1';
  const params = new URLSearchParams({
    serviceKey,
    type: 'json',
    ...(isListApi
      ? { PG_SZ: String(numOfRows), PAGE: String(pageNo) }
      : { numOfRows: String(numOfRows), pageNo: String(pageNo) }),
    ...extra,
  });
  const url = `${BASE_URL}/${service}/${endpoint}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`LH API 오류 [${endpoint}]: ${res.status}`);

  const json = await res.json();

  // LH 데이터셋 포맷: [{dsSch:[...]}, {dsList:[...], resHeader:[...]}]
  if (Array.isArray(json)) {
    let dataItems: RawItem[] = [];
    let totalCount = 0;
    for (const ds of json as Record<string, unknown>[]) {
      for (const [key, val] of Object.entries(ds)) {
        if (key === 'resHeader' || key === 'dsSch') continue;
        if (Array.isArray(val)) {
          const nonempty = (val as RawItem[]).filter((r) => Object.keys(r).length > 0);
          if (nonempty.length > 0) {
            dataItems = nonempty;
            // ALL_CNT 필드에서 전체 건수 추출
            totalCount = parseInt(nonempty[0].ALL_CNT ?? String(nonempty.length)) || nonempty.length;
          }
        }
      }
    }
    return { items: dataItems, totalCount, raw: json };
  }

  // 표준 data.go.kr 포맷: response.body.items.item[]
  const body = json?.response?.body ?? json;
  const rawItems = body?.items?.item ?? body?.items ?? [];
  const items: RawItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const totalCount: number = body?.totalCount ?? items.length;

  return { items, totalCount, raw: json };
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

export interface FetchRentalListParams {
  page: number;
  perPage: number;
  region?: string;
}

// 광역시도 약칭 → LH API CNP_CD 코드
const REGION_CODE: Record<string, string> = {
  '서울': '11', '부산': '26', '대구': '27', '인천': '28',
  '광주': '29', '대전': '30', '울산': '31', '세종': '36',
  '경기': '41', '강원': '51', '충북': '43', '충남': '44',
  '전북': '45', '전남': '46', '경북': '47', '경남': '48', '제주': '50',
};

export async function fetchLhRentalList(
  serviceKey: string,
  { page, perPage, region }: FetchRentalListParams
): Promise<{ items: LhRentalItem[]; total: number }> {
  // lhLeaseNoticeInfo1 requires PAN_ST_DT and PAN_ED_DT
  const today = new Date();
  const start = new Date(today); start.setMonth(start.getMonth() - 3);
  const end   = new Date(today); end.setMonth(end.getMonth() + 6);
  const extra: Record<string, string> = {
    PAN_ST_DT: toYmd(start),
    PAN_ED_DT: toYmd(end),
    PAN_SS: '공고중',
    UPP_AIS_TP_CD: '06', // 임대주택만 (상가·토지 제외)
  };
  if (region && region !== '전체' && REGION_CODE[region]) {
    extra.CNP_CD = REGION_CODE[region];
  }

  const { items: raw, totalCount } = await callLhApi(
    'lhLeaseNoticeInfo1',
    'lhLeaseNoticeInfo1',
    serviceKey,
    page,
    perPage,
    extra,
  );

  const ALLOWED_TYPES = new Set([
    '행복주택', '영구임대', '분양주택', '국민임대', '매입임대',
    '행복주택(신혼희망)', '공공분양(신혼희망)', '공공임대', '통합공공임대', '장기전세',
  ]);
  const items = raw
    .filter((r) => ALLOWED_TYPES.has(r.AIS_TP_CD_NM ?? ''))
    .map(parseListItem);

  // 서버 필터링 후 실제 건수로 보정
  const filteredTotal = items.length < perPage
    ? (page - 1) * perPage + items.length
    : totalCount;

  return { items, total: filteredTotal };
}

export interface LhSupplyParams {
  panId: string;
  ccrCd?: string;
  uppTpCd?: string;
  aisTpCd?: string;
  splTpCd?: string;
}

export async function fetchLhSupplyUnits(
  serviceKey: string,
  params: LhSupplyParams
): Promise<LhSupplyUnit[]> {
  const { panId, ccrCd = '03', uppTpCd = '', aisTpCd = '', splTpCd = '' } = params;
  const extra: Record<string, string> = {
    PAN_ID: panId,
    CCR_CNNT_SYS_DS_CD: ccrCd,
  };
  if (uppTpCd) extra.UPP_AIS_TP_CD = uppTpCd;
  if (aisTpCd) extra.AIS_TP_CD = aisTpCd;
  if (splTpCd) extra.SPL_INF_TP_CD = splTpCd;

  const { items: raw } = await callLhApi(
    'lhLeaseNoticeSplInfo1',
    'getLeaseNoticeSplInfo1',
    serviceKey,
    1,
    100,
    extra,
  );

  return raw.map((r) => ({
    houseType:   r.HOUSE_TY ?? r.SUPLY_TP ?? '',
    supplyType:  r.SUPLY_TY_CD_NM ?? r.SUPLY_TP_NM ?? '일반',
    count:       parseInt(r.SUPLY_HSHLDCO ?? '0') || 0,
    deposit:     parseInt(r.LTTOT_TOP_AMOUNT ?? r.DEPOSIT_AMT ?? '0') || 0,
    monthlyRent: parseInt(r.MONTHLY_RENT_AMT ?? '0') || 0,
  }));
}

export async function fetchLhRentalDetail(
  serviceKey: string,
  params: { panId: string; ccrCd?: string; uppTpCd?: string; aisTpCd?: string }
): Promise<LhRentalItem | null> {
  const { panId, ccrCd = '03', uppTpCd = '06', aisTpCd = '' } = params;
  try {
    const { items: raw } = await callLhApi(
      'lhLeaseNoticeDtlInfo1',
      'getLeaseNoticeDtlInfo1',
      serviceKey,
      1,
      1,
      {
        PAN_ID:             panId,
        CCR_CNNT_SYS_DS_CD: ccrCd,
        UPP_AIS_TP_CD:      uppTpCd,
        ...(aisTpCd && { AIS_TP_CD: aisTpCd }),
        SPL_INF_TP_CD: '010',
      },
    );
    if (!raw.length) return null;
    return parseItem({ ...raw[0], PAN_ID: panId });
  } catch {
    return null;
  }
}

export async function fetchLhRentalItemById(
  serviceKey: string,
  panId: string
): Promise<LhRentalItem | null> {
  const today = new Date();
  const start = new Date(today); start.setMonth(start.getMonth() - 12);
  const end   = new Date(today); end.setMonth(end.getMonth() + 12);
  try {
    const { items: raw } = await callLhApi(
      'lhLeaseNoticeInfo1',
      'lhLeaseNoticeInfo1',
      serviceKey,
      1,
      200,
      { PAN_ST_DT: toYmd(start), PAN_ED_DT: toYmd(end) },
    );
    const match = raw.find((r) => r.PAN_ID === panId);
    if (!match) return null;
    return parseListItem(match);
  } catch {
    return null;
  }
}

// ─── raw 디버그용 ─────────────────────────────────────────────────────────────

export async function fetchLhAttachments(
  serviceKey: string,
  item: Pick<LhRentalItem, 'ccrCnt' | 'ccrCnntSysDsCd' | 'uppAisTpCd' | 'aisTpCd' | 'splInfTpCd'>
): Promise<LhAttachment[]> {
  const { items: raw } = await callLhApi(
    'lhLeaseNoticeDtlInfo1',
    'getLeaseNoticeDtlInfo1',
    serviceKey,
    1,
    20,
    {
      PAN_ID:            item.ccrCnt,
      CCR_CNNT_SYS_DS_CD: item.ccrCnntSysDsCd || '03',
      UPP_AIS_TP_CD:     item.uppAisTpCd,
      AIS_TP_CD:         item.aisTpCd,
      SPL_INF_TP_CD:     '010',
    },
  );

  return raw
    .filter((r) => r.AHFL_URL?.startsWith('http'))
    .map((r) => {
      const nm  = r.SL_PAN_AHFL_DS_CD_NM ?? '';
      const url = r.AHFL_URL ?? '';
      const type: LhAttachment['type'] = nm.includes('PDF') || url.endsWith('.pdf') ? 'pdf'
        : nm.includes('hwp') || url.endsWith('.hwp') ? 'hwp' : 'etc';
      return { name: r.CMN_AHFL_NM ?? nm, url, type };
    });
}

export async function fetchLhRaw(
  serviceKey: string,
  service: string,
  endpoint: string,
  pageNo = 1,
  numOfRows = 3,
  extra?: Record<string, string>
): Promise<unknown> {
  const { raw } = await callLhApi(service, endpoint, serviceKey, pageNo, numOfRows, extra);
  return raw;
}
