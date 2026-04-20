import { NextRequest, NextResponse } from 'next/server';
import { fetchLhSupplyUnits } from '@/lib/lhApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ccrCnt = searchParams.get('ccrCnt') ?? '';

  const key = process.env.LH_API_KEY;
  if (!key || !ccrCnt) return NextResponse.json({ units: [] });

  try {
    const units = await fetchLhSupplyUnits(key, ccrCnt);
    return NextResponse.json({ units });
  } catch {
    return NextResponse.json({ units: [] });
  }
}
