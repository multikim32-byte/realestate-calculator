import { NextRequest, NextResponse } from 'next/server';
import { fetchTradeList, LAWD_CODE_MAP } from '@/lib/tradeApi';
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

// 시도 전체: 해당 시도의 모든 시군구를 병렬 fetch 후 합산
async function fetchSido(sidoName: string, dealYmd: string): Promise<TradeItem[]> {
  const districts = LAWD_CODE_MAP[sidoName as keyof typeof LAWD_CODE_MAP];
  if (!districts) return [];

  // 중복 코드 제거
  const seen = new Set<string>();
  const uniq = (districts as readonly { name: string; code: string }[]).filter(d => {
    if (seen.has(d.code)) return false;
    seen.add(d.code);
    return true;
  });

  const results = await Promise.all(uniq.map(d => fetchAll(d.code, dealYmd).catch(() => [] as TradeItem[])));
  return results.flat();
}

function computeStats(
  curr: TradeItem[], prev: TradeItem[],
  location: string,
  currYm: string, prevYm: string,
) {
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

  if (!lawdCd && !sido) {
    return NextResponse.json({ error: 'lawdCd or sido required' }, { status: 400 });
  }

  const currYm = ym(0);
  const prevYm = ym(-1);
  const location = sigungu ? `${sido} ${sigungu}` : sido;

  try {
    let curr: TradeItem[];
    let prev: TradeItem[];

    if (lawdCd) {
      // 시군구 단위: 단일 코드 fetch
      [curr, prev] = await Promise.all([
        fetchAll(lawdCd, currYm),
        fetchAll(lawdCd, prevYm),
      ]);
    } else {
      // 시도 단위: 해당 시도 전체 병렬 fetch
      [curr, prev] = await Promise.all([
        fetchSido(sido, currYm),
        fetchSido(sido, prevYm),
      ]);
    }

    const stats = computeStats(curr, prev, location, currYm, prevYm);
    const res = NextResponse.json(stats);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err) {
    console.error('trade trend API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
