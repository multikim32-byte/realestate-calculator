import { NextRequest, NextResponse } from 'next/server';
import { fetchLhRentalDetail, fetchLhRentalItemById } from '@/lib/lhApi';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: panId } = await params;
  const { searchParams } = req.nextUrl;
  const ccrCd   = searchParams.get('ccrCd') ?? '03';
  const uppTpCd = searchParams.get('uppTpCd') ?? '06';
  const aisTpCd = searchParams.get('aisTpCd') ?? '';

  const key = process.env.LH_API_KEY;
  if (!key) return NextResponse.json({ item: null });

  try {
    // Try targeted detail API first, fall back to list search
    let item = await fetchLhRentalDetail(key, { panId, ccrCd, uppTpCd, aisTpCd });
    if (!item) item = await fetchLhRentalItemById(key, panId);

    const res = NextResponse.json({ item });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err) {
    console.error('LH detail API 오류:', err);
    return NextResponse.json({ item: null });
  }
}
