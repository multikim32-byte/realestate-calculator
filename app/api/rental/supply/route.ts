import { NextRequest, NextResponse } from 'next/server';
import { fetchLhSupplyUnits } from '@/lib/lhApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // Support both new (panId) and legacy (ccrCnt) param names
  const panId   = searchParams.get('panId') ?? searchParams.get('ccrCnt') ?? '';
  const ccrCd   = searchParams.get('ccrCd') ?? '03';
  const uppTpCd = searchParams.get('uppTpCd') ?? '';
  const aisTpCd = searchParams.get('aisTpCd') ?? '';
  const splTpCd = searchParams.get('splTpCd') ?? '';

  const key = process.env.LH_API_KEY;
  if (!key || !panId) return NextResponse.json({ units: [] });

  try {
    const units = await fetchLhSupplyUnits(key, { panId, ccrCd, uppTpCd, aisTpCd, splTpCd });
    const res = NextResponse.json({ units });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch {
    return NextResponse.json({ units: [] });
  }
}
