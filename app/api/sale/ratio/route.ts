import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY;
  if (!key) return NextResponse.json({ source: 'no_key', ratio: [] });

  const { searchParams } = req.nextUrl;
  const houseManageNo = searchParams.get('houseManageNo') || '';
  const pblancNo      = searchParams.get('pblancNo')      || '';

  if (!houseManageNo) {
    return NextResponse.json({ source: 'missing_params', ratio: [] });
  }

  try {
    // 주택관리번호로 필터링
    const qs = [
      `serviceKey=${encodeURIComponent(key)}`,
      `page=1`,
      `perPage=100`,
      `cond[주택관리번호::EQ]=${encodeURIComponent(houseManageNo)}`,
    ].join('&');

    const res = await fetch(`${RATIO_BASE}?${qs}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`API 오류: ${res.status}`);

    const json = await res.json();
    const ratio: any[] = json.data ?? [];

    return NextResponse.json({ source: 'api', ratio, total: json.totalCount ?? ratio.length });
  } catch (err) {
    console.error('경쟁률 API 오류:', err);
    return NextResponse.json({ source: 'error', ratio: [], error: String(err) });
  }
}
