import { NextResponse } from 'next/server';

const RATIO_BASE = 'https://api.odcloud.kr/api/15101048/v1/uddi:2f83a0c5-ef17-4c1a-bee6-d53e37fd67e5';

export async function GET() {
  const key = process.env.APT_RATIO_API_KEY;
  if (!key) return NextResponse.json({ error: 'APT_RATIO_API_KEY 없음' });

  const results: any[] = [];

  // 1) 필터 없이 최근 데이터 10건 조회 (API 자체가 동작하는지 확인)
  try {
    const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=10`;
    const res = await fetch(`${RATIO_BASE}?${qs}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json();
    results.push({
      test: '필터없이 10건',
      status: res.status,
      totalCount: json.totalCount,
      firstRow: json.data?.[0] ?? null,
      dataLen: (json.data ?? []).length,
    });
  } catch (e) {
    results.push({ test: '필터없이 10건', error: String(e) });
  }

  // 2) 주택관리번호 필터 테스트 (cond[] 방식)
  try {
    const qs = `serviceKey=${encodeURIComponent(key)}&page=1&perPage=10&cond[주택관리번호::EQ]=2024000659`;
    const res = await fetch(`${RATIO_BASE}?${qs}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json();
    results.push({
      test: 'cond[주택관리번호::EQ] 필터',
      status: res.status,
      totalCount: json.totalCount,
      dataLen: (json.data ?? []).length,
    });
  } catch (e) {
    results.push({ test: 'cond 필터', error: String(e) });
  }

  return NextResponse.json({ keyExists: !!key, results });
}
