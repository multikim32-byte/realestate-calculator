/**
 * 국토교통부 아파트 전월세 실거래 자료 API
 * https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent
 *
 * 파라미터:
 *  - LAWD_CD  : 5자리 법정동 코드 (시/군/구)
 *  - DEAL_YMD : 거래년월 (YYYYMM)
 *  - pageNo   : 페이지 번호
 *  - numOfRows: 페이지당 행수
 */

import { fetchWithTimeout } from './fetchWithTimeout';

const RENT_URL =
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

export interface RentItem {
  name: string;          // 아파트명
  dong: string;          // 법정동
  area: number;          // 전용면적 (㎡)
  floor: number;         // 층
  deposit: number;       // 보증금 (만원)
  monthlyRent: number;   // 월세 (만원) — 0이면 전세
  contractTerm: string;  // 계약기간 (예: "24")
  contractType: string;  // 계약구분 (신규/갱신)
  preDeposit: number;    // 종전계약보증금 (만원)
  preMonthlyRent: number; // 종전계약월세 (만원)
  builtYear: number;     // 건축년도
  dealDate: string;      // YYYY-MM-DD
}

// ─── XML 파서 ────────────────────────────────────────────────────────────────

function xmlVal(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/,/g, '').replace(/\s/g, '')) || 0;
}

function parseItems(xml: string): RentItem[] {
  const items: RentItem[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of blocks) {
    const deposit = parseAmount(xmlVal(block, 'deposit'));
    if (deposit === 0) continue;

    const year  = xmlVal(block, 'dealYear');
    const month = xmlVal(block, 'dealMonth').padStart(2, '0');
    const day   = xmlVal(block, 'dealDay').padStart(2, '0');

    items.push({
      name:           xmlVal(block, 'aptNm'),
      dong:           xmlVal(block, 'umdNm'),
      area:           parseFloat(xmlVal(block, 'excluUseAr')) || 0,
      floor:          parseInt(xmlVal(block, 'floor')) || 0,
      deposit,
      monthlyRent:    parseAmount(xmlVal(block, 'monthlyRent')),
      contractTerm:   xmlVal(block, 'contractTerm').trim(),
      contractType:   xmlVal(block, 'contractType').trim(),
      preDeposit:     parseAmount(xmlVal(block, 'preDeposit')),
      preMonthlyRent: parseAmount(xmlVal(block, 'preMonthlyRent')),
      builtYear:      parseInt(xmlVal(block, 'buildYear')) || 0,
      dealDate:       year && month && day ? `${year}-${month}-${day}` : '',
    });
  }

  return items;
}

function parseTotalCount(xml: string): number {
  return parseInt(xmlVal(xml, 'totalCount')) || 0;
}


// ─── 공개 함수 ────────────────────────────────────────────────────────────────

export async function fetchRentList(
  lawdCd: string,
  dealYmd: string,
  page = 1,
  numOfRows = 100,
): Promise<{ items: RentItem[]; total: number }> {
  const key = process.env.MOLIT_API_KEY?.trim();
  if (!key) throw new Error('MOLIT_API_KEY가 설정되지 않았습니다.');

  const qs = `serviceKey=${key}&pageNo=${page}&numOfRows=${numOfRows}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;
  const url = `${RENT_URL}?${qs}`;

  const res = await fetchWithTimeout(url, { cache: 'no-store' });
  const xml = await res.text();

  if (!res.ok) {
    throw new Error(`국토부 API ${res.status}: ${xml.slice(0, 300)}`);
  }

  if (xml.includes('<errMsg>') || xml.includes('SERVICE_KEY') || xml.includes('<returnReasonCode>')) {
    const msg = xmlVal(xml, 'errMsg') || xmlVal(xml, 'returnAuthMsg') || xmlVal(xml, 'returnReasonCode') || xml.slice(0, 200);
    throw new Error(`국토부 API 인증오류: ${msg}`);
  }

  return {
    items: parseItems(xml),
    total: parseTotalCount(xml),
  };
}
