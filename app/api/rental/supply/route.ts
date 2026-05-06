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

  if (debug) {
    // 실제 callLhApi가 받는 raw 전체 + PAN_ID / CCR_CNT 두 파라미터 모두 테스트
    const extra: Record<string, string> = {
      CCR_CNNT_SYS_DS_CD: ccrCd,
    };
    if (uppTpCd) extra.UPP_AIS_TP_CD = uppTpCd;
    if (aisTpCd) extra.AIS_TP_CD = aisTpCd;
    if (splTpCd) extra.SPL_INF_TP_CD = splTpCd;

    const [rawWithPanId, rawWithCcrCnt] = await Promise.all([
      fetchLhRaw(key, 'lhLeaseNoticeSplInfo1', 'getLeaseNoticeSplInfo1', 1, 5, { ...extra, PAN_ID: panId }),
      fetchLhRaw(key, 'lhLeaseNoticeSplInfo1', 'getLeaseNoticeSplInfo1', 1, 5, { ...extra, CCR_CNT: panId }),
    ]);
    return NextResponse.json({ rawWithPanId, rawWithCcrCnt, params: { panId, ccrCd, uppTpCd, aisTpCd, splTpCd } });
  }

  try {
    const units = await fetchLhSupplyUnits(key, { panId, ccrCd, uppTpCd, aisTpCd, splTpCd });
    const res = NextResponse.json({ units });
    res.headers.set('Cache-Control', 'no-store'); // 캐시 비활성화로 항상 최신 데이터
    return res;
  } catch {
    return NextResponse.json({ units: [] });
  }
}
