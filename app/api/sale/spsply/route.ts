import { NextRequest, NextResponse } from 'next/server';

const POPUP_URL = 'https://www.applyhome.co.kr/ai/aia/selectSpsplyReqstStusPopup.do';

const TYPES = ['다자녀', '신혼부부', '생애최초', '청년', '노부모부양', '신생아'] as const;

export type SpsplyRow = {
  주택형: string;
  공급세대수: number;
  청약결과: string;
  배정: Record<string, number>;
  기관추천배정: number;
  이전기관배정: number;
  해당지역: Record<string, number>;
  기타지역: Record<string, number>;
  기관합산: string;
};

async function scrapeSpecialSupply(houseManageNo: string, pblancNo: string): Promise<SpsplyRow[]> {
  const url = `${POPUP_URL}?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible)',
      'Referer': 'https://www.applyhome.co.kr/',
    },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];

  const html = await res.text();

  // tbody 내 td 값 flat하게 추출 (rowspan 무시)
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return [];

  const tds: string[] = [];
  const tdRegex = /<td(?:[^>]*)>(?:<b>)?\s*([^<]*?)\s*(?:<\/b>)?<\/td>/g;
  let m;
  while ((m = tdRegex.exec(tbodyMatch[1])) !== null) {
    tds.push(m[1].trim());
  }

  // 주택형당 28개 td: [주택형, 공급세대수, "배정세대수", 다자녀~이전기관(8), 청약결과, "해당지역", 다자녀~신생아(6), 기관합산, 이전합산, "기타지역", 다자녀~신생아(6)]
  const BLOCK = 28;
  const rows: SpsplyRow[] = [];

  for (let i = 0; i + BLOCK <= tds.length; i += BLOCK) {
    const b = tds.slice(i, i + BLOCK);
    if (b[2] !== '배정세대수') continue; // 안전 검증

    const 배정: Record<string, number> = {};
    const 해당지역: Record<string, number> = {};
    const 기타지역: Record<string, number> = {};

    TYPES.forEach((t, j) => {
      배정[t] = parseInt(b[3 + j]) || 0;
      해당지역[t] = parseInt(b[13 + j]) || 0;
      기타지역[t] = parseInt(b[22 + j]) || 0;
    });

    rows.push({
      주택형: b[0],
      공급세대수: parseInt(b[1]) || 0,
      청약결과: b[11] || '',
      배정,
      기관추천배정: parseInt(b[9]) || 0,
      이전기관배정: parseInt(b[10]) || 0,
      해당지역,
      기타지역,
      기관합산: b[19] || '',
    });
  }

  return rows;
}

export async function GET(req: NextRequest) {
  const houseManageNo = req.nextUrl.searchParams.get('houseManageNo') || '';
  const pblancNo = req.nextUrl.searchParams.get('pblancNo') || houseManageNo;

  if (!houseManageNo) return NextResponse.json({ rows: [] });

  try {
    const rows = await scrapeSpecialSupply(houseManageNo, pblancNo);
    const response = NextResponse.json({ rows, total: rows.length });
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return response;
  } catch (err) {
    console.error('특별공급 API 오류:', err);
    return NextResponse.json({ rows: [], error: String(err) });
  }
}
