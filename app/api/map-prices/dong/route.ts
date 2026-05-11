import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';
import type { PriceStats } from '../route';

export interface DongPrice {
  dong: string;
  all: PriceStats;
  y5:  PriceStats;
  y10: PriceStats;
  y15: PriceStats;
  y20: PriceStats;
}

const cache = new Map<string, { data: DongPrice[]; ts: number }>();
const TTL = 60 * 60 * 1000;
const CURRENT_YEAR = new Date().getFullYear();

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
  const totalPrice = withArea.reduce((s, it) => s + it.price, 0);
  const totalArea  = withArea.reduce((s, it) => s + it.area,  0);
  const avgPerM2 = withArea.length > 0 && totalArea > 0
    ? Math.round(totalPrice / totalArea)
    : 0;
  const avgTotal = Math.round(items.reduce((s, it) => s + it.price, 0) / items.length);
  return { avgPerM2, avgTotal, count: items.length };
}

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

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const cached = cache.get(code);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  // 최근 3개월 데이터 합산 (동별 샘플 확보)
  const months = getRecentMonths();
  const allItems: TradeItem[] = [];
  for (const ym of months) {
    try {
      const { items } = await fetchTradeList(code, ym, 1, 300);
      allItems.push(...items);
    } catch { /* 해당 월 실패 시 스킵 */ }
  }

  if (allItems.length === 0) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'public, max-age=3600' } });
  }

  // 동별 그룹핑
  const dongMap = new Map<string, { all: TradeItem[]; y5: TradeItem[]; y10: TradeItem[]; y15: TradeItem[]; y20: TradeItem[] }>();
  for (const it of allItems) {
    const dong = it.dong?.trim() || '기타';
    if (!dongMap.has(dong)) dongMap.set(dong, { all: [], y5: [], y10: [], y15: [], y20: [] });
    const g = dongMap.get(dong)!;
    g.all.push(it);
    if (it.builtYear > 0) g[ageGroup(it.builtYear)].push(it);
  }

  const result: DongPrice[] = [...dongMap.entries()]
    .map(([dong, g]) => ({
      dong,
      all: calcStats(g.all),
      y5:  calcStats(g.y5),
      y10: calcStats(g.y10),
      y15: calcStats(g.y15),
      y20: calcStats(g.y20),
    }))
    .filter(d => d.all.count >= 2)           // 2건 미만은 통계 의미 없음
    .sort((a, b) => b.all.avgPerM2 - a.all.avgPerM2);

  cache.set(code, { data: result, ts: Date.now() });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
