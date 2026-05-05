import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';
const PER_PAGE = 1000;

async function fetchPage(key: string, page: number): Promise<Record<string, unknown>[]> {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=${page}&perPage=${PER_PAGE}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function getTotalCount(key: string): Promise<number> {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=1`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const json = await res.json();
  return json.totalCount ?? 0;
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ source: 'missing_params', ratio: [] });

  const manageNo = parseInt(houseManageNo);

  try {
    const total = await getTotalCount(key);
    const totalPages = Math.ceil(total / PER_PAGE);

    // 전체 페이지 병렬 조회 (최대 50페이지 = 5만건 제한)
    const pages = Array.from({ length: Math.min(totalPages, 50) }, (_, i) => i + 1);
    const pageResults = await Promise.all(pages.map(p => fetchPage(key, p)));
    const combined = pageResults.flat();

    // 주택관리번호로 필터 (숫자 또는 문자열 비교 모두 처리)
    const ratio = combined.filter((r) => {
      const v = r['주택관리번호'];
      return parseInt(String(v ?? '')) === manageNo || String(v ?? '').trim() === houseManageNo;
    });

    // 중복 제거
    const seen = new Set<string>();
    const deduped = ratio.filter((r) => {
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
        ? { totalInDataset: total, totalPages, scannedPages: pages.length, sampleFields: combined[0] ? Object.keys(combined[0]) : [] }
        : undefined,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
