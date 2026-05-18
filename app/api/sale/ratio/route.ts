import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';
const POPUP_URL = 'https://www.applyhome.co.kr/ai/aia/selectAPTCompetitionPopup.do';

export type RatioRow = {
  주택형: string;
  순위: number;
  거주지역: string;
  거주코드: number;
  공급세대수: number;
  접수건수: number;
  경쟁률: string | null;
  공고번호: number;
  주택관리번호: number;
  모델번호: number;
};

async function fetchByManageNo(key: string, no: string): Promise<RatioRow[]> {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=100&cond%5B%EC%A3%BC%ED%83%9D%EA%B4%80%EB%A6%AC%EB%B2%88%ED%98%B8%3A%3AEQ%5D=${no}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as RatioRow[];
}

// 청약홈 팝업 HTML 스크래핑 (공공 API에 2026 데이터 없을 때 폴백)
async function scrapeFromApplyhome(houseManageNo: string, pblancNo: string): Promise<RatioRow[]> {
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
  const rows: RatioRow[] = [];

  // <tr data-ty="..." data-sem="...">...</tr> 파싱
  const trRegex = /<tr\s+data-ty="[^"]*"\s+data-sem="[^"]*">([\s\S]*?)<\/tr>/g;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    const tds: string[] = [];
    const tdRegex = /<td[^>]*>\s*([^<]*?)\s*<\/td>/g;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      tds.push(tdMatch[1].trim());
    }
    if (tds.length < 6) continue;

    const 순위 = tds[2] === '1순위' ? 1 : 2;
    const 거주지역 = tds[3];
    const 거주코드 = 거주지역 === '해당지역' ? 1 : 거주지역 === '기타지역' ? 2 : 3;
    const raw경쟁률 = tds[5];
    const 경쟁률: string | null = (!raw경쟁률 || raw경쟁률 === '-') ? null : raw경쟁률;

    rows.push({
      주택형: tds[0],
      순위,
      거주지역,
      거주코드,
      공급세대수: parseInt(tds[1]) || 0,
      접수건수: parseInt(tds[4]) || 0,
      경쟁률,
      공고번호: parseInt(pblancNo) || 0,
      주택관리번호: parseInt(houseManageNo) || 0,
      모델번호: 0,
    });
  }

  return rows;
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  const houseManageNo = req.nextUrl.searchParams.get('houseManageNo') || '';
  const pblancNo = req.nextUrl.searchParams.get('pblancNo') || houseManageNo;

  if (!houseManageNo) return NextResponse.json({ ratio: [] });

  try {
    let rows: RatioRow[] = [];

    // 1순위: 공공 API (2025 이하 데이터)
    if (key) {
      rows = await fetchByManageNo(key, houseManageNo);
    }

    // 2순위: 공공 API에 없으면 청약홈 팝업 스크래핑
    if (rows.length === 0 && pblancNo) {
      rows = await scrapeFromApplyhome(houseManageNo, pblancNo);
    }

    // 중복 제거 (주택형 + 순위 + 거주코드 기준)
    const seen = new Set<string>();
    const deduped = rows.filter(r => {
      const k = `${r.주택형}|${r.순위}|${r.거주코드}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const response = NextResponse.json({ ratio: deduped, total: deduped.length });
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    return response;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ ratio: [], error: String(err) });
  }
}
