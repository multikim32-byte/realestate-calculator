import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';

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
  // cond[주택관리번호::EQ] 직접 필터 — 100건 초과 시 전체 수신
  const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=100&cond%5B%EC%A3%BC%ED%83%9D%EA%B4%80%EB%A6%AC%EB%B2%88%ED%98%B8%3A%3AEQ%5D=${no}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as RatioRow[];
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ ratio: [] });

  const houseManageNo = req.nextUrl.searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ ratio: [] });

  try {
    const rows = await fetchByManageNo(key, houseManageNo);

    // 중복 제거 (주택형 + 순위 + 거주코드 기준)
    const seen = new Set<string>();
    const deduped = rows.filter(r => {
      const k = `${r.주택형}|${r.순위}|${r.거주코드}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const response = NextResponse.json({ ratio: deduped, total: deduped.length });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ ratio: [], error: String(err) });
  }
}
