import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicSaleList, fetchUnitDetails, FetchType } from '@/lib/publicDataApi';
import { mockSaleItems } from '@/lib/mockData';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region   = searchParams.get('region')  || '전체';
  const type     = (searchParams.get('type')   || 'all') as FetchType;
  const page     = parseInt(searchParams.get('page')    || '1');
  const perPage  = parseInt(searchParams.get('perPage') || '10');
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo   = searchParams.get('dateTo')   || undefined;

  // 주택형별 조회 (단지 상세 페이지에서 사용)
  const houseManageNo = searchParams.get('houseManageNo');
  const pblancNo      = searchParams.get('pblancNo');
  const buildingType  = searchParams.get('buildingType') || '';
  const recruitType   = searchParams.get('recruitType')  || '';

  if (houseManageNo && pblancNo) {
    if (!process.env.PUBLIC_DATA_API_KEY) {
      return NextResponse.json({ units: [], source: 'mock' });
    }
    try {
      const units = await fetchUnitDetails(houseManageNo, pblancNo, buildingType, recruitType);
      return NextResponse.json({ units, source: 'api' });
    } catch (err) {
      return NextResponse.json({ units: [], source: 'error', error: String(err) });
    }
  }

  // API 키 없으면 목 데이터
  if (!process.env.PUBLIC_DATA_API_KEY) {
    let items = mockSaleItems;
    if (region !== '전체') items = items.filter(i => i.region === region);
    return NextResponse.json({ items, total: items.length, source: 'mock' });
  }

  try {
    const result = await fetchPublicSaleList({ type, page, perPage, dateFrom, dateTo });

    // 지역 필터
    let items = result.items;
    if (region !== '전체') {
      items = items.filter(i => i.region === region);
    }

    const res = NextResponse.json({ items, total: result.total, source: 'api', type });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res;
  } catch (err) {
    console.error('청약홈 API 오류:', err);
    let items = mockSaleItems;
    if (region !== '전체') items = items.filter(i => i.region === region);
    return NextResponse.json({
      items,
      total: items.length,
      source: 'mock_fallback',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
