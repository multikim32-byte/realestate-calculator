import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList } from '@/lib/tradeApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawdCd   = searchParams.get('lawdCd');
  const dealYmd  = searchParams.get('dealYmd');
  const page     = parseInt(searchParams.get('page') || '1');
  const numOfRows = parseInt(searchParams.get('numOfRows') || '100');

  if (!lawdCd || !dealYmd) {
    return NextResponse.json({ error: 'lawdCd, dealYmd 파라미터 필요' }, { status: 400 });
  }

  if (!process.env.MOLIT_API_KEY) {
    return NextResponse.json({ items: [], total: 0, source: 'no_key' });
  }

  try {
    const result = await fetchTradeList(lawdCd, dealYmd, page, numOfRows);
    return NextResponse.json({ ...result, source: 'api' });
  } catch (err) {
    console.error('실거래가 API 오류:', err);
    return NextResponse.json(
      { items: [], total: 0, source: 'error' },
      { status: 200 } // 클라이언트가 source 필드로 오류 감지
    );
  }
}
