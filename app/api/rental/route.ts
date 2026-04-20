import { NextRequest, NextResponse } from 'next/server';
import { fetchLhRentalList, fetchLhRaw } from '@/lib/lhApi';
import { mockRentalItems } from '@/lib/mockRentalData';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region   = searchParams.get('region') || '전체';
  const page     = parseInt(searchParams.get('page') || '1');
  const perPage  = parseInt(searchParams.get('perPage') || '12');
  const debug    = searchParams.get('debug');

  const key = process.env.LH_API_KEY;

  // 디버그: 실제 API 응답 구조 확인용
  if (debug && key) {
    try {
      const service   = searchParams.get('service')   || 'lhLeaseNoticeInfo1';
      const endpoint  = searchParams.get('endpoint')  || 'lhLeaseNoticeInfo1';
      const panStDt   = searchParams.get('PAN_ST_DT') || '20200101';
      const panEdDt   = searchParams.get('PAN_ED_DT') || '20261231';
      const raw = await fetchLhRaw(key, service, endpoint, 1, 5, { PAN_ST_DT: panStDt, PAN_ED_DT: panEdDt });
      return NextResponse.json({ raw });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  if (!key) {
    let items = mockRentalItems;
    if (region !== '전체') items = items.filter((i) => i.region === region);
    return NextResponse.json({ items, total: items.length, source: 'mock' });
  }

  try {
    const result = await fetchLhRentalList(key, { page, perPage, region });
    return NextResponse.json({ ...result, source: 'api' });
  } catch (err) {
    console.error('LH API 오류:', err);
    let items = mockRentalItems;
    if (region !== '전체') items = items.filter((i) => i.region === region);
    return NextResponse.json({
      items,
      total: items.length,
      source: 'mock_fallback',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
