import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';

// API 레벨에서 주택관리번호로 필터링 — 전체 데이터셋 검색
async function fetchByManageNo(key: string, houseManageNo: string) {
  const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=100`
    + `&cond[주택관리번호::EQ]=${encodeURIComponent(houseManageNo)}`;
  const res = await fetch(`${RATIO_BASE}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const json = await res.json();
  return { data: json.data ?? [], totalCount: json.totalCount ?? 0, raw: json };
}

// cond 필터가 작동하지 않을 때 폴백: 최근 페이지부터 검색
async function fetchRecentPages(key: string, manageNo: number) {
  // 1페이지로 총 건수 확인
  const firstQs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=1`;
  const firstRes = await fetch(`${RATIO_BASE}?${firstQs}`, {
    headers: { Accept: 'application/json' }, cache: 'no-store',
  });
  const firstJson = await firstRes.json();
  const total: number = firstJson.totalCount ?? 0;

  // 최신 데이터는 마지막 페이지에 있을 수 있으므로 앞 5 + 뒤 5 페이지 병렬 조회
  const PER = 1000;
  const lastPage = Math.ceil(total / PER);
  const pages = [...new Set([
    1, 2, 3,
    Math.max(1, lastPage - 2), Math.max(1, lastPage - 1), lastPage,
  ])];

  const results = await Promise.all(pages.map(async (p) => {
    const qs = `serviceKey=${encodeURIComponent(key)}&page=${p}&perPage=${PER}`;
    const r = await fetch(`${RATIO_BASE}?${qs}`, {
      headers: { Accept: 'application/json' }, cache: 'no-store',
    });
    const j = await r.json();
    return (j.data ?? []) as Record<string, unknown>[];
  }));

  const combined = results.flat();
  return combined.filter((r) => {
    const v = parseInt(String(r['주택관리번호'] ?? ''));
    return v === manageNo;
  });
}

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  if (!houseManageNo) return NextResponse.json({ source: 'missing_params', ratio: [] });

  const manageNo = parseInt(houseManageNo);

  try {
    // 1차: API 레벨 cond 필터 (전체 검색)
    const { data, raw } = await fetchByManageNo(key, houseManageNo);
    let rows: Record<string, unknown>[] = data;

    // cond 필터가 무시되어 전체 데이터가 내려온 경우 → JS 필터 적용
    if (rows.length > 0 && !rows.some(r => parseInt(String(r['주택관리번호'] ?? '')) === manageNo)) {
      rows = rows.filter(r => parseInt(String(r['주택관리번호'] ?? '')) === manageNo);
    }

    // 2차: cond 필터 결과가 0건이면 최근 페이지 탐색 폴백
    if (rows.length === 0) {
      rows = await fetchRecentPages(key, manageNo);
    }

    // 중복 제거
    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      const k = `${r['주택형']}|${r['순위']}|${r['거주지역']}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const res = NextResponse.json({
      source: 'api',
      ratio: deduped,
      total: deduped.length,
      // 디버그: 데이터 없을 때 API 응답 샘플 확인용 (나중에 제거)
      _debug: deduped.length === 0 ? { totalInDataset: raw?.totalCount, sample: raw?.data?.slice(0, 2) } : undefined,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
