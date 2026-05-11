import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList, LAWD_CODE_MAP } from '@/lib/tradeApi';

export interface DistrictPrice {
  name: string;
  code: string;
  avgTotal: number;   // 평균 거래총액 (만원)
  avgPerM2: number;   // 평균 ㎡당 가격 (만원)
  count: number;
}

// 모듈 레벨 인메모리 캐시
const cache = new Map<string, { data: DistrictPrice[]; ts: number }>();
const TTL = 60 * 60 * 1000; // 1시간

function getRecentMonths(): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = 1; i <= 3; i++) {
    const m = new Date(d);
    m.setMonth(d.getMonth() - i);
    months.push(`${m.getFullYear()}${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

async function fetchDistrictPrice(code: string, name: string): Promise<DistrictPrice | null> {
  const months = getRecentMonths();
  for (const ym of months) {
    try {
      const { items } = await fetchTradeList(code, ym, 1, 100);
      if (items.length === 0) continue;
      const withArea = items.filter(it => it.area > 0 && it.price > 0);
      if (withArea.length === 0) continue;
      const avgTotal  = Math.round(items.reduce((s, it) => s + it.price, 0) / items.length);
      const avgPerM2  = Math.round(withArea.reduce((s, it) => s + it.price / it.area, 0) / withArea.length);
      return { name, code, avgTotal, avgPerM2, count: items.length };
    } catch { /* 다음 월 시도 */ }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sido = req.nextUrl.searchParams.get('sido');
  if (!sido) return NextResponse.json({ error: 'sido required' }, { status: 400 });

  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP];
  if (!districts) return NextResponse.json({ error: 'unknown sido' }, { status: 400 });

  // 중복 코드 제거 (화성시 등 중복 항목)
  const unique = [...new Map(districts.map(d => [d.code, d])).values()];

  const cached = cache.get(sido);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  // 5개씩 병렬 요청
  const BATCH = 5;
  const results: DistrictPrice[] = [];
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const fetched = await Promise.all(batch.map(d => fetchDistrictPrice(d.code, d.name)));
    results.push(...(fetched.filter(Boolean) as DistrictPrice[]));
  }

  cache.set(sido, { data: results, ts: Date.now() });
  return NextResponse.json(results, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
