import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';
const PER_PAGE = 100;
const BATCH = 5;

async function fetchPage(key: string, page: number): Promise<{ data: Record<string, unknown>[]; totalCount: number }> {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=${page}&perPage=${PER_PAGE}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const json = await res.json();
  return { data: json.data ?? [], totalCount: json.totalCount ?? 0 };
}

function matches(r: Record<string, unknown>, manageNo: number, houseManageNo: string) {
  const v = r['주택관리번호'];
  return parseInt(String(v ?? '')) === manageNo || String(v ?? '').trim() === houseManageNo;
}

async function searchBatch(key: string, pages: number[]): Promise<Record<string, unknown>[]> {
  const results = await Promise.all(pages.map(p => fetchPage(key, p)));
  return results.flatMap(r => r.data);
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ source: 'missing_params', ratio: [] });

  const manageNo = parseInt(houseManageNo);

  try {
    const first = await fetchPage(key, 1);
    const totalCount = first.totalCount;
    const totalPages = Math.ceil(totalCount / PER_PAGE);

    // 최신(2026)은 마지막 페이지에, 과거(2025↓)는 앞에 있으므로
    // 뒤 30페이지 → 앞 30페이지 순서로 검색
    const tailPages = Array.from({ length: Math.min(30, totalPages) }, (_, i) => totalPages - i).filter(p => p > 0);
    const headPages = Array.from({ length: Math.min(30, totalPages) }, (_, i) => i + 1).filter(p => !tailPages.includes(p));
    const searchOrder = [...tailPages, ...headPages];

    let found: Record<string, unknown>[] = [];

    // 1차: 뒤 30페이지 우선 검색 (5페이지씩 배치)
    for (let i = 0; i < searchOrder.length; i += BATCH) {
      const batch = searchOrder.slice(i, i + BATCH);
      const data = await searchBatch(key, batch);
      const matched = data.filter(r => matches(r, manageNo, houseManageNo));
      if (matched.length > 0) { found = matched; break; }
    }

    // 중복 제거
    const seen = new Set<string>();
    const deduped = found.filter((r) => {
      const k = `${r['주택형']}|${r['순위']}|${r['거주지역']}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const response = NextResponse.json({
      source: 'api',
      ratio: deduped,
      total: deduped.length,
      _debug: deduped.length === 0
        ? { totalInDataset: totalCount, totalPages, sampleValue: first.data[0]?.['주택관리번호'] }
        : undefined,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
