import { NextRequest, NextResponse } from 'next/server';
import { fetchRentList } from '@/lib/rentApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawdCd    = searchParams.get('lawdCd');
  const dealYmd   = searchParams.get('dealYmd');
  const page      = parseInt(searchParams.get('page') || '1');
  const numOfRows = parseInt(searchParams.get('numOfRows') || '100');

  if (!lawdCd || !dealYmd) {
    return NextResponse.json({ error: 'lawdCd, dealYmd 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.MOLIT_API_KEY) {
    return NextResponse.json({ items: [], total: 0, source: 'no_key' });
  }

  try {
    const result = await fetchRentList(lawdCd, dealYmd, page, numOfRows);
    const res = NextResponse.json({ ...result, source: 'api' });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err) {
    console.error('전월세 API 오류:', err);
    return NextResponse.json(
      { items: [], total: 0, source: 'error' },
      { status: 200 }
    );
  }
}
