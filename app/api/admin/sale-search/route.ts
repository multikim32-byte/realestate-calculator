import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchSaleByKeyword } from '@/lib/publicDataApi';

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
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
