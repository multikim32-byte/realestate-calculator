import { NextRequest, NextResponse } from 'next/server';
import { fetchPropertyRentList } from '@/lib/rentApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawdCd    = searchParams.get('lawdCd');
  const dealYmd   = searchParams.get('dealYmd');
  const page      = parseInt(searchParams.get('page') || '1');
  const numOfRows = parseInt(searchParams.get('numOfRows') || '100');

  if (!lawdCd || !dealYmd) {
    return NextResponse.json({ error: 'lawdCd, dealYmd 필수' }, { status: 400 });
  }
  try {
    const result = await fetchPropertyRentList('villa', lawdCd, dealYmd, page, numOfRows);
    return NextResponse.json({ ...result, source: 'api' }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json({ items: [], total: 0, source: 'error' });
  }
}
