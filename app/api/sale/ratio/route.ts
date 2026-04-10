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
    // 1) 첫 페이지로 totalCount 파악
    const first = await fetchPage(key, 1);
    const totalCount = first.totalCount;
    const lastPage = Math.ceil(totalCount / PER_PAGE);

    // 2) 최신 데이터가 마지막 페이지에 있으므로 마지막 2페이지 병렬 조회
    const pages = [lastPage];
    if (lastPage > 1) pages.push(lastPage - 1);

    const pageResults = await Promise.all(pages.map(p => fetchPage(key, p)));
    const allData = pageResults.flatMap(r => r.data);

    // 3) 첫 페이지 데이터도 포함 (오래된 단지 대비)
    const combined = [...first.data, ...allData];

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

    return NextResponse.json({ source: 'api', ratio: deduped, total: deduped.length });
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
