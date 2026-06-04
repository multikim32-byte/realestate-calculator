/**
 * 시군구별 월별 거래량 이력 API
 *
 * GET /api/district-history?lawdCd=11680
 *
 * 1. DB에 캐시된 데이터 반환
 * 2. 누락된 최근 6개월은 MOLIT API에서 즉시 수집 후 저장
 * 3. 오래된 과거 데이터는 백그라운드 스크립트(collect-district-monthly.mjs)로 채움
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

// 최근 N개월 YYYYMM 목록 (최신순)
function recentYms(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// MOLIT API → 건수 집계
async function fetchCounts(url: string, lawdCd: string, dealYmd: string, apiKey: string) {
  let tradeCnt = 0, jeonseCnt = 0, wolseCnt = 0;
  let page = 1;
  while (true) {
    try {
      const u = `${url}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${page}&numOfRows=1000`;
      const res  = await fetch(u, { signal: AbortSignal.timeout(12000) });
      const text = await res.text();
      const items = text.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      if (!items.length) break;

      const get = (block: string, tag: string) =>
        block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? '';

      for (const block of items) {
        if (url.includes('Trade')) {
          tradeCnt++;
        } else {
          const monthly = parseInt(get(block, 'monthlyRent') || '0') || 0;
          if (monthly === 0) jeonseCnt++; else wolseCnt++;
        }
      }

      // 페이지네이션
      const total = parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
      if (items.length < 1000 || page * 1000 >= total) break;
      page++;
    } catch { break; }
  }
  return { tradeCnt, jeonseCnt, wolseCnt };
}

export async function GET(req: NextRequest) {
  const lawdCd = req.nextUrl.searchParams.get('lawdCd');
  if (!lawdCd) return NextResponse.json({ error: 'lawdCd 필요' }, { status: 400 });

  const db     = supabase();
  const apiKey = process.env.MOLIT_API_KEY ?? '';

  // 1. DB에서 전체 이력 조회
  const { data: rows } = await db
    .from('district_trade_monthly')
    .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
    .eq('lawd_cd', lawdCd)
    .order('deal_ym', { ascending: true });

  const cached = new Set((rows ?? []).map(r => r.deal_ym));

  // 2. 최근 6개월 중 누락된 달만 즉시 수집
  const recent6 = recentYms(6);
  const missing = recent6.filter(ym => !cached.has(ym));

  if (missing.length > 0 && apiKey) {
    await Promise.all(
      missing.map(async ym => {
        const [trade, rent] = await Promise.all([
          fetchCounts(TRADE_URL, lawdCd, ym, apiKey),
          fetchCounts(RENT_URL,  lawdCd, ym, apiKey),
        ]);
        await db.from('district_trade_monthly').upsert({
          lawd_cd:    lawdCd,
          deal_ym:    ym,
          trade_cnt:  trade.tradeCnt,
          jeonse_cnt: rent.jeonseCnt,
          wolse_cnt:  rent.wolseCnt,
        }, { onConflict: 'lawd_cd,deal_ym' });
      })
    );

    // 갱신 후 다시 조회
    const { data: updated } = await db
      .from('district_trade_monthly')
      .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
      .eq('lawd_cd', lawdCd)
      .order('deal_ym', { ascending: true });

    const res = NextResponse.json({ data: updated ?? [] });
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  }

  const res = NextResponse.json({ data: rows ?? [] });
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
