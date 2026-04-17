import { NextRequest, NextResponse } from 'next/server';
import { fetchSaleDetail } from '@/lib/publicDataApi';
import { mockSaleItems } from '@/lib/mockData';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ item: null }, { status: 400 });

  // API 키 없으면 목 데이터에서 찾기
  if (!process.env.PUBLIC_DATA_API_KEY) {
    const item = mockSaleItems.find(i => i.id === id) ?? null;
    return NextResponse.json({ item, source: 'mock' });
  }

  try {
    const item = await fetchSaleDetail(id);
    if (item) return NextResponse.json({ item, source: 'api' });

    // 공공 API에서 못 찾으면 목 데이터 fallback
    const mock = mockSaleItems.find(i => i.id === id) ?? null;
    return NextResponse.json({ item: mock, source: 'mock_fallback' });
  } catch (err) {
    const mock = mockSaleItems.find(i => i.id === id) ?? null;
    console.error('sale/detail API 오류:', err);
    return NextResponse.json({ item: mock, source: 'error' });
  }
}
