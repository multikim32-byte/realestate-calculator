import { NextRequest, NextResponse } from 'next/server';
import { fetchLhSupplyUnits, fetchLhRaw } from '@/lib/lhApi';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const panId   = searchParams.get('panId') ?? searchParams.get('ccrCnt') ?? '';
  const ccrCd   = searchParams.get('ccrCd') ?? '03';
  const uppTpCd = searchParams.get('uppTpCd') ?? '';
  const aisTpCd = searchParams.get('aisTpCd') ?? '';
  const splTpCd = searchParams.get('splTpCd') ?? '';
  const debug   = searchParams.get('debug');

  const key = process.env.LH_API_KEY;
  if (!key || !panId) return NextResponse.json({ units: [] });

  // 실제 API 필드명 확인용 디버그 모드
  if (debug) {
    const extra: Record<string, string> = { PAN_ID: panId, CCR_CNNT_SYS_DS_CD: ccrCd };
    if (uppTpCd) extra.UPP_AIS_TP_CD = uppTpCd;
    if (aisTpCd) extra.AIS_TP_CD = aisTpCd;
    if (splTpCd) extra.SPL_INF_TP_CD = splTpCd;
    const raw = await fetchLhRaw(key, 'lhLeaseNoticeSplInfo1', 'getLeaseNoticeSplInfo1', 1, 5, extra);
    return NextResponse.json({ raw, params: { panId, ccrCd, uppTpCd, aisTpCd, splTpCd } });
  }

  try {
    const units = await fetchLhSupplyUnits(key, { panId, ccrCd, uppTpCd, aisTpCd, splTpCd });
    const res = NextResponse.json({ units });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch {
    return NextResponse.json({ units: [] });
  }
}
