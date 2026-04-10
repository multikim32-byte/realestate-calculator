import { NextRequest, NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';

export async function GET(req: NextRequest) {
  const key = process.env.APT_RATIO_API_KEY;
  if (!key) return NextResponse.json({ error: 'APT_RATIO_API_KEY 없음' });

  // 마지막 페이지 (가장 최신 데이터) 조회
  const first = await fetch(`${RATIO_BASE}?serviceKey=${encodeURIComponent(key)}&page=1&perPage=1000`, {
    headers: { Accept: 'application/json' }, cache: 'no-store',
  }).then(r => r.json());

  const totalCount = first.totalCount ?? 0;
  const lastPage = Math.ceil(totalCount / 1000);

  const last = await fetch(`${RATIO_BASE}?serviceKey=${encodeURIComponent(key)}&page=${lastPage}&perPage=1000`, {
    headers: { Accept: 'application/json' }, cache: 'no-store',
  }).then(r => r.json());

  // 최신 데이터의 주택관리번호 목록 확인
  const lastData: any[] = last.data ?? [];
  const recentNos = [...new Set(lastData.map((r: any) => r.주택관리번호))].slice(0, 30);
  const recentNames = [...new Set(lastData.map((r: any) => `${r.주택관리번호}|${r.주택형}`))].slice(0, 10);

  // 검색 파라미터로 houseManageNo 받으면 그것도 찾아봄
  const { searchParams } = req.nextUrl;
  const testNo = searchParams.get('no');
  let found: any[] = [];
  if (testNo) {
    const all = [...(first.data ?? []), ...lastData];
    found = all.filter((r: any) => String(r.주택관리번호) === testNo);
  }

  return NextResponse.json({
    totalCount,
    lastPage,
    lastPageDataCount: lastData.length,
    recentManageNos: recentNos,
    recentSamples: recentNames,
    ...(testNo ? { searchedNo: testNo, found } : {}),
  });
}
