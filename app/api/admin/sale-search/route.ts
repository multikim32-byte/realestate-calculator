import { NextRequest, NextResponse } from 'next/server';
import { searchSaleByKeyword } from '@/lib/publicDataApi';

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword') ?? '';
  if (keyword.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchSaleByKeyword(keyword);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ items: [], error: String(err) }, { status: 500 });
  }
}
