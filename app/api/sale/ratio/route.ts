import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';
const PER_PAGE = 1000;

async function fetchPage(key: string, page: number) {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=${page}&perPage=${PER_PAGE}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const json = await res.json();
  return { data: json.data ?? [], totalCount: json.totalCount ?? 0 };
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ source: 'missing_params', ratio: [] });

  const manageNo = parseInt(houseManageNo);

  try {
    // 페이지 1이 최신 데이터 → 첫 3페이지 병렬 조회
    const pageResults = await Promise.all([1, 2, 3].map(p => fetchPage(key, p)));
    const combined = pageResults.flatMap(r => r.data);

    // 4) 주택관리번호로 JavaScript 필터링
    const ratio = combined.filter((r: any) => {
      const v = parseInt(String(r.주택관리번호 ?? ''));
      return v === manageNo;
    });

    // 중복 제거
    const seen = new Set<string>();
    const deduped = ratio.filter((r: any) => {
      const k = `${r.주택형}|${r.순위}|${r.거주지역}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const res = NextResponse.json({ source: 'api', ratio: deduped, total: deduped.length });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [] });
  }
}
