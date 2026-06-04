/**
 * 시군구/단지별 월별 거래량 이력 API
 *
 * GET /api/district-history?lawdCd=11680
 *   → district_trade_monthly 기반 시군구 전체 이력
 *
 * GET /api/district-history?lawdCd=11680&aptName=래미안강남힐즈
 *   → apt_trade_monthly 기반 단지 이력
 *
 * GET /api/district-history?lawdCd=11680&dong=개포동
 *   → apt_trade_monthly 기반 동 전체 집계 이력
 *
 * 최근 6개월 누락 시 MOLIT API 즉시 수집 → DB 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const RENT_URL  = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function recentYms(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function getTag(block: string, tag: string) {
  return block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';
}

async function fetchAndAggregate(url: string, lawdCd: string, dealYmd: string, apiKey: string) {
  const aptMap = new Map<string, { aptName: string; dong: string; tradeCnt: number; jeonseCnt: number; wolseCnt: number; totalPrice: number; totalDeposit: number }>();
  let districtTrade = 0, districtJeonse = 0, districtWolse = 0;
  let page = 1;

  while (true) {
    try {
      const u = `${url}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=1000`;
      const res  = await fetch(u, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const items = text.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      if (!items.length) break;

      for (const block of items) {
        const aptName = getTag(block, 'aptNm') || '(미상)';
        const dong    = getTag(block, 'umdNm') || '';
        const key     = `${aptName}||${dong}`;
        if (!aptMap.has(key)) aptMap.set(key, { aptName, dong, tradeCnt: 0, jeonseCnt: 0, wolseCnt: 0, totalPrice: 0, totalDeposit: 0 });
        const a = aptMap.get(key)!;
        if (url.includes('Trade')) {
          const price = parseInt(getTag(block, 'dealAmount').replace(/,/g,'')) || 0;
          a.tradeCnt++; a.totalPrice += price; districtTrade++;
        } else {
          const monthly = parseInt(getTag(block, 'monthlyRent') || '0') || 0;
          const deposit = parseInt((getTag(block, 'deposit') || '0').replace(/,/g,'')) || 0;
          if (monthly === 0) { a.jeonseCnt++; a.totalDeposit += deposit; districtJeonse++; }
          else               { a.wolseCnt++; districtWolse++; }
        }
      }
      const total = parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
      if (items.length < 1000 || page * 1000 >= total) break;
      page++;
    } catch { break; }
  }
  return { districtTrade, districtJeonse, districtWolse, aptMap };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawdCd  = searchParams.get('lawdCd');
  const aptName = searchParams.get('aptName') ?? '';
  const dong    = searchParams.get('dong') ?? '';

  if (!lawdCd) return NextResponse.json({ error: 'lawdCd 필요' }, { status: 400 });

  const db     = supabase();
  const apiKey = process.env.MOLIT_API_KEY ?? '';
  const mode   = aptName ? 'apt' : dong ? 'dong' : 'district';

  // ── 1. DB 조회 ─────────────────────────────────────────────────────────────
  let rows: { deal_ym: string; trade_cnt: number; jeonse_cnt: number; wolse_cnt: number; avg_trade_price?: number | null; avg_jeonse_price?: number | null }[] = [];

  if (mode === 'district') {
    const { data } = await db
      .from('district_trade_monthly')
      .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
      .eq('lawd_cd', lawdCd)
      .order('deal_ym', { ascending: true });
    rows = data ?? [];
  } else if (mode === 'apt') {
    const { data } = await db
      .from('apt_trade_monthly')
      .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt, avg_trade_price, avg_jeonse_price')
      .eq('lawd_cd', lawdCd)
      .eq('apt_name', aptName)
      .order('deal_ym', { ascending: true });
    rows = data ?? [];
  } else {
    // dong 모드: 해당 동의 모든 단지 합산
    const { data } = await db
      .from('apt_trade_monthly')
      .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
      .eq('lawd_cd', lawdCd)
      .eq('dong', dong)
      .order('deal_ym', { ascending: true });

    // deal_ym 기준 합산
    const ymMap = new Map<string, { trade_cnt: number; jeonse_cnt: number; wolse_cnt: number }>();
    for (const r of data ?? []) {
      if (!ymMap.has(r.deal_ym)) ymMap.set(r.deal_ym, { trade_cnt: 0, jeonse_cnt: 0, wolse_cnt: 0 });
      const m = ymMap.get(r.deal_ym)!;
      m.trade_cnt  += r.trade_cnt;
      m.jeonse_cnt += r.jeonse_cnt;
      m.wolse_cnt  += r.wolse_cnt;
    }
    rows = [...ymMap.entries()].sort().map(([deal_ym, v]) => ({ deal_ym, ...v }));
  }

  const cached = new Set(rows.map(r => r.deal_ym));

  // ── 2. 최근 6개월 누락 즉시 수집 (district 모드만) ──────────────────────────
  if (mode === 'district' && apiKey) {
    const missing = recentYms(6).filter(ym => !cached.has(ym));
    if (missing.length > 0) {
      await Promise.all(missing.map(async ym => {
        const [trade, rent] = await Promise.all([
          fetchAndAggregate(TRADE_URL, lawdCd, ym, apiKey),
          fetchAndAggregate(RENT_URL,  lawdCd, ym, apiKey),
        ]);

        await db.from('district_trade_monthly').upsert({
          lawd_cd: lawdCd, deal_ym: ym,
          trade_cnt: trade.districtTrade, jeonse_cnt: rent.districtJeonse, wolse_cnt: rent.districtWolse,
        }, { onConflict: 'lawd_cd,deal_ym' });

        // apt_trade_monthly도 동시 업데이트
        const aptRows = [...trade.aptMap.entries(), ...rent.aptMap.entries()]
          .reduce((acc, [k, v]) => {
            const existing = acc.get(k);
            if (existing) {
              existing.tradeCnt  += v.tradeCnt;  existing.jeonseCnt += v.jeonseCnt;
              existing.wolseCnt  += v.wolseCnt;  existing.totalPrice += v.totalPrice;
              existing.totalDeposit += v.totalDeposit;
            } else acc.set(k, { ...v });
            return acc;
          }, new Map<string, typeof trade.aptMap extends Map<string, infer V> ? V : never>());

        const rows = [...aptRows.values()].map(a => ({
          lawd_cd: lawdCd, apt_name: a.aptName, dong: a.dong, deal_ym: ym,
          trade_cnt: a.tradeCnt, jeonse_cnt: a.jeonseCnt, wolse_cnt: a.wolseCnt,
          avg_trade_price:  a.tradeCnt  > 0 ? Math.round(a.totalPrice   / a.tradeCnt)  : null,
          avg_jeonse_price: a.jeonseCnt > 0 ? Math.round(a.totalDeposit / a.jeonseCnt) : null,
        }));
        for (let i = 0; i < rows.length; i += 100)
          await db.from('apt_trade_monthly').upsert(rows.slice(i, i + 100), { onConflict: 'lawd_cd,apt_name,deal_ym' });
      }));

      // 갱신 후 재조회
      const { data: updated } = await db
        .from('district_trade_monthly')
        .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
        .eq('lawd_cd', lawdCd)
        .order('deal_ym', { ascending: true });
      rows = updated ?? [];
    }
  }

  const res = NextResponse.json({ data: rows });
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
