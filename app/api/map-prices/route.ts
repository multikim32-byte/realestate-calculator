import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList, LAWD_CODE_MAP } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';

export interface PriceStats {
  avgPerM2: number;  // 만원/㎡
  avgTotal: number;  // 만원
  count: number;
}

export interface DistrictPrice {
  name: string;
  code: string;
  all: PriceStats;
  y5:  PriceStats;  // 5년 이내 (0~5년)
  y10: PriceStats;  // 10년 (6~10년)
  y15: PriceStats;  // 15년 (11~15년)
  y20: PriceStats;  // 20년+ (16년 이상)
}

const cache = new Map<string, { data: DistrictPrice[]; ts: number }>();
const TTL = 60 * 60 * 1000;

const CURRENT_YEAR = new Date().getFullYear();

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

function ageGroup(builtYear: number): 'y5' | 'y10' | 'y15' | 'y20' {
  const age = CURRENT_YEAR - builtYear;
  if (age <= 5)  return 'y5';
  if (age <= 10) return 'y10';
  if (age <= 15) return 'y15';
  return 'y20';
}

function calcStats(items: TradeItem[]): PriceStats {
  if (items.length === 0) return { avgPerM2: 0, avgTotal: 0, count: 0 };
  const withArea = items.filter(it => it.area > 0 && it.price > 0);
  const avgPerM2 = withArea.length > 0
    ? Math.round(withArea.reduce((s, it) => s + it.price / it.area, 0) / withArea.length)
    : 0;
  const avgTotal = Math.round(items.reduce((s, it) => s + it.price, 0) / items.length);
  return { avgPerM2, avgTotal, count: items.length };
}

async function fetchDistrictPrice(code: string, name: string): Promise<DistrictPrice | null> {
  const months = getRecentMonths();
  for (const ym of months) {
    try {
      const { items } = await fetchTradeList(code, ym, 1, 100);
      if (items.length === 0) continue;

      const groups: Record<string, TradeItem[]> = { y5: [], y10: [], y15: [], y20: [] };
      for (const it of items) {
        if (it.builtYear > 0) groups[ageGroup(it.builtYear)].push(it);
      }

      return {
        name, code,
        all: calcStats(items),
        y5:  calcStats(groups.y5),
        y10: calcStats(groups.y10),
        y15: calcStats(groups.y15),
        y20: calcStats(groups.y20),
      };
    } catch { /* 다음 월 시도 */ }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sido = req.nextUrl.searchParams.get('sido');
  if (!sido) return NextResponse.json({ error: 'sido required' }, { status: 400 });

  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP];
  if (!districts) return NextResponse.json({ error: 'unknown sido' }, { status: 400 });

  const unique = [...new Map(districts.map(d => [d.code, d])).values()];

  const cached = cache.get(sido);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

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
