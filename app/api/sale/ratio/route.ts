import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';
const PER_PAGE = 100;
const BATCH = 5; // 동시 요청 수 제한

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

function matchesManageNo(r: Record<string, unknown>, manageNo: number, houseManageNo: string) {
  const v = r['주택관리번호'];
  return parseInt(String(v ?? '')) === manageNo || String(v ?? '').trim() === houseManageNo;
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ source: 'missing_params', ratio: [] });

  const manageNo = parseInt(houseManageNo);

  try {
    // 1페이지로 총 건수 확인
    const first = await fetchPage(key, 1);
    const totalCount = first.totalCount;
    const totalPages = Math.ceil(totalCount / PER_PAGE);

    // 1페이지 결과에서 먼저 확인
    let found = first.data.filter(r => matchesManageNo(r, manageNo, houseManageNo));

    // 없으면 나머지 페이지를 배치(5개씩)로 순차 검색
    if (found.length === 0 && totalPages > 1) {
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      for (let i = 0; i < remainingPages.length; i += BATCH) {
        const batch = remainingPages.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(p => fetchPage(key, p)));
        const combined = results.flatMap(r => r.data);
        const matched = combined.filter(r => matchesManageNo(r, manageNo, houseManageNo));
        found = [...found, ...matched];
        if (found.length > 0) break; // 찾으면 즉시 중단
      }
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
        ? {
            totalInDataset: totalCount,
            totalPages,
            sampleFields: first.data[0] ? Object.keys(first.data[0]) : [],
            sampleValue: first.data[0] ? first.data[0]['주택관리번호'] : null,
          }
        : undefined,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
