import { NextResponse } from 'next/server';

const BASE = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

// 검단호수공원역 파라곤 AA36BL 기준 테스트
const TEST_HOUSE_MANAGE_NO = '2024000659';
const TEST_PBLANC_NO       = '2024000659';

async function tryEndpoint(endpoint: string, key: string, cond: Record<string, string>) {
  let qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=10`;
  for (const [k, v] of Object.entries(cond)) {
    qs += `&${k}=${encodeURIComponent(v)}`;
  }
  const url = `${BASE}/${endpoint}?${qs}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
    return { endpoint, status: res.status, totalCount: json.totalCount ?? null, dataLen: (json.data ?? []).length, ok: res.ok && (json.data?.length ?? 0) > 0 };
  } catch (e) {
    return { endpoint, status: 0, error: String(e), ok: false };
  }
}

export async function GET() {
  const key = process.env.PUBLIC_DATA_API_KEY;
  if (!key) return NextResponse.json({ error: 'API 키 없음' });

  const cond = {
    'cond[HOUSE_MANAGE_NO::EQ]': TEST_HOUSE_MANAGE_NO,
    'cond[PBLANC_NO::EQ]':       TEST_PBLANC_NO,
  };

  // 가능한 경쟁률/접수현황 엔드포인트 후보들 테스트
  const candidates = [
    'getAPTLttotPblancMdlRatio',
    'getAPTLttotPblancSpcltRcept',
    'getAPTRatioInfo',
    'getAPTRcntInfo',
    'getAPTSplySttusInfo',
    'getAPTLttotPblancRatio',
    'getAPTRcptRatioInfo',
    'getAPTLttotPblancRcptRatio',
  ];

  const results = await Promise.all(candidates.map(ep => tryEndpoint(ep, key, cond)));
  const working = results.filter(r => r.ok);

  return NextResponse.json({ working, all: results });
}
