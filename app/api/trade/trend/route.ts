import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';

function ym(offsetMonths = 0) {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + offsetMonths, 1);
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchAll(lawdCd: string, dealYmd: string): Promise<TradeItem[]> {
  const items: TradeItem[] = [];
  let page = 1;
  while (true) {
    const r = await fetchTradeList(lawdCd, dealYmd, page, 1000);
    items.push(...r.items);
    if (page * 1000 >= r.total) break;
    page++;
  }
  return items;
}

function computeStats(
  curr: TradeItem[], prev: TradeItem[],
  sido: string, sigungu: string,
  currYm: string, prevYm: string,
) {
  const location = sido && sigungu ? `${sido} ${sigungu}` : '';
  const bucket = (a: number) => Math.round(a / 5) * 5;

  type Group = { trades: TradeItem[]; meta: TradeItem };
  const buildGroups = (trades: TradeItem[]) => {
    const m = new Map<string, Group>();
    for (const t of trades) {
      const k = `${t.name}__${t.dong}__${bucket(t.area)}`;
      if (!m.has(k)) m.set(k, { trades: [], meta: t });
      m.get(k)!.trades.push(t);
    }
    return m;
  };

  const cg = buildGroups(curr);
  const pg = buildGroups(prev);

  const changeList: object[] = [];
  for (const [k, { trades: ct, meta }] of cg) {
    if (ct.length < 2) continue;
    const pv = pg.get(k);
    if (!pv || pv.trades.length < 2) continue;
    const cAvg = ct.reduce((s, t) => s + t.price, 0) / ct.length;
    const pAvg = pv.trades.reduce((s, t) => s + t.price, 0) / pv.trades.length;
    const pct = ((cAvg - pAvg) / pAvg) * 100;
    changeList.push({
      name: meta.name, dong: meta.dong, location,
      areaBucket: bucket(meta.area), builtYear: meta.builtYear || 0,
      currentAvg: Math.round(cAvg), prevAvg: Math.round(pAvg),
      changePct: Math.round(pct * 10) / 10, count: ct.length,
    });
  }

  const rising = changeList
    .filter((v: any) => v.changePct > 0)
    .sort((a: any, b: any) => b.changePct - a.changePct)
    .slice(0, 10).map((v, i) => ({ rank: i + 1, ...v }));

  const falling = changeList
    .filter((v: any) => v.changePct < 0)
    .sort((a: any, b: any) => a.changePct - b.changePct)
    .slice(0, 10).map((v, i) => ({ rank: i + 1, ...v }));

  const priceMap = new Map<string, TradeItem>();
  for (const t of curr) {
    const k = `${t.name}__${t.dong}`;
    if (!priceMap.has(k) || t.price > priceMap.get(k)!.price) priceMap.set(k, t);
  }
  const top_price = [...priceMap.values()]
    .sort((a, b) => b.price - a.price).slice(0, 10)
    .map((t, i) => ({
      rank: i + 1, name: t.name, dong: t.dong, location,
      area: Math.round(t.area), price: t.price,
      dealDate: t.dealDate, floor: t.floor, builtYear: t.builtYear || 0,
    }));

  const volMap = new Map<string, { count: number; total: number; meta: TradeItem }>();
  for (const t of curr) {
    const k = `${t.name}__${t.dong}`;
    if (!volMap.has(k)) volMap.set(k, { count: 0, total: 0, meta: t });
    const g = volMap.get(k)!;
    g.count++; g.total += t.price;
  }
  const top_volume = [...volMap.values()]
    .sort((a, b) => b.count - a.count).slice(0, 10)
    .map(({ count, total, meta }, i) => ({
      rank: i + 1, name: meta.name, dong: meta.dong, location,
      builtYear: meta.builtYear || 0, count,
      avgPrice: Math.round(total / count),
    }));

  return {
    stat_date: new Date().toISOString().slice(0, 10),
    current_month: currYm,
    prev_month: prevYm,
    rising, falling, top_price, top_volume,
    total_trades_current: curr.length,
    total_trades_prev: prev.length,
  };
}

export async function GET(req: NextRequest) {
  const lawdCd  = req.nextUrl.searchParams.get('lawdCd') || '';
  const sido    = req.nextUrl.searchParams.get('sido') || '';
  const sigungu = req.nextUrl.searchParams.get('sigungu') || '';

  if (!lawdCd) return NextResponse.json({ error: 'lawdCd required' }, { status: 400 });

  const currYm = ym(0);
  const prevYm = ym(-1);

  try {
    const [curr, prev] = await Promise.all([
      fetchAll(lawdCd, currYm),
      fetchAll(lawdCd, prevYm),
    ]);
    const stats = computeStats(curr, prev, sido, sigungu, currYm, prevYm);
    const res = NextResponse.json(stats);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err) {
    console.error('trade trend API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
