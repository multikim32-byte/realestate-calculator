import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

async function callApi(endpoint: string, serviceKey: string, params: Record<string, string>) {
  let qs = `serviceKey=${encodeURIComponent(serviceKey)}&page=1&perPage=100`;
  for (const [k, v] of Object.entries(params)) {
    qs += `&${k}=${encodeURIComponent(v)}`;
  }
  const res = await fetch(`${BASE}/${endpoint}?${qs}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function GET(req: NextRequest) {
  const key = process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', spclt: [], ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  const pblancNo      = searchParams.get('pblancNo')      || '';

  if (!houseManageNo || !pblancNo) {
    return NextResponse.json({ source: 'missing_params', spclt: [], ratio: [] });
  }

  const cond = {
    'cond[HOUSE_MANAGE_NO::EQ]': houseManageNo,
    'cond[PBLANC_NO::EQ]': pblancNo,
  };

  try {
    // 특별공급 접수현황 + 순위별 경쟁률 병렬 조회
    const [spclt, ratio] = await Promise.all([
      callApi('getAPTLttotPblancSpcltRcept', key, cond),   // 특별공급 접수현황
      callApi('getAPTLttotPblancMdlRatio', key, cond),      // 주택형별 경쟁률
    ]);

    return NextResponse.json({ source: 'api', spclt, ratio });
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', spclt: [], ratio: [], error: String(err) });
  }
}
