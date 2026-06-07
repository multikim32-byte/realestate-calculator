/**
 * 시군구/단지별 월별 거래량 이력 API
 *
 * GET /api/district-history?lawdCd=11680
 *   → district_trade_monthly 기반 시군구 전체 이력
 *
 * GET /api/district-history?lawdCd=11680&aptName=래미안강남힐즈
 *   → apt_trades 기반 단지 이력 (최근 3년), 없으면 apt_trade_monthly fallback
 *
 * GET /api/district-history?lawdCd=11680&dong=개포동
 *   → apt_trades 기반 동 전체 집계 이력
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// 영문 브랜드 → 한글 변환
const BRAND_NORM: [RegExp, string][] = [
  [/^lg/i, '엘지'], [/^gs/i, '지에스'], [/^sk/i, '에스케이'],
  [/^kcc/i, '케이씨씨'], [/^hdc/i, '에이치디씨'], [/^dl/i, '디엘'],
  [/^e편한세상/, '이편한세상'],
];

function normName(s: string) {
  let n = (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  for (const [pat, rep] of BRAND_NORM) n = n.replace(pat, rep);
  return n;
}

function matchName(a: string, b: string) {
  const na = normName(a), nb = normName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawdCd  = searchParams.get('lawdCd');
  const aptName = searchParams.get('aptName') ?? '';
  const dong    = searchParams.get('dong') ?? '';

  if (!lawdCd) return NextResponse.json({ error: 'lawdCd 필요' }, { status: 400 });

  const db   = supabase();
  const mode = aptName ? 'apt' : dong ? 'dong' : 'district';

  type Row = { deal_ym: string; trade_cnt: number; jeonse_cnt: number; wolse_cnt: number; avg_trade_price?: number | null; avg_jeonse_price?: number | null };
  let rows: Row[] = [];

  // ── district 모드: district_trade_monthly ───────────────────────────────────
  if (mode === 'district') {
    const { data } = await db
      .from('district_trade_monthly')
      .select('deal_ym, trade_cnt, jeonse_cnt, wolse_cnt')
      .eq('lawd_cd', lawdCd)
      .order('deal_ym', { ascending: true });
    rows = data ?? [];

  // ── apt 모드: apt_trades (최근 데이터) + apt_trade_monthly (과거 fallback) ──
  } else if (mode === 'apt') {
    // 1) apt_trades에서 최근 36개월 집계
    const { data: trades } = await db
      .from('apt_trades')
      .select('apt_name, deal_ym, deal_type, price')
      .eq('lawd_cd', lawdCd)
      .gte('deal_ym', (() => {
        const d = new Date(); d.setMonth(d.getMonth() - 36);
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
      })())
      .not('price', 'is', null);

    // aptName 매칭 후 deal_ym별 집계
    if (trades?.length) {
      const matchedNames = new Set(
        [...new Set(trades.map(t => t.apt_name))].filter(n => matchName(n, aptName))
      );

      if (matchedNames.size > 0) {
        const filtered = trades.filter(t => matchedNames.has(t.apt_name));
        const ymMap = new Map<string, { T: number[]; J: number[]; W: number }>();
        for (const t of filtered) {
          if (!ymMap.has(t.deal_ym)) ymMap.set(t.deal_ym, { T: [], J: [], W: 0 });
          const m = ymMap.get(t.deal_ym)!;
          if (t.deal_type === 'T') m.T.push(t.price!);
          else if (t.deal_type === 'J') m.J.push(t.price!);
          else m.W++;
        }

        rows = [...ymMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([deal_ym, v]) => ({
          deal_ym,
          trade_cnt:        v.T.length,
          jeonse_cnt:       v.J.length,
          wolse_cnt:        v.W,
          avg_trade_price:  v.T.length ? Math.round(v.T.reduce((a,b)=>a+b,0)/v.T.length) : null,
          avg_jeonse_price: v.J.length ? Math.round(v.J.reduce((a,b)=>a+b,0)/v.J.length) : null,
        }));
      }
    }


  // ── dong 모드: apt_trades 집계 ──────────────────────────────────────────────
  } else {
    const { data: trades } = await db
      .from('apt_trades')
      .select('deal_ym, deal_type, price')
      .eq('lawd_cd', lawdCd)
      .eq('dong', dong)
      .not('price', 'is', null);

    if (trades?.length) {
      const ymMap = new Map<string, { T: number; J: number; W: number }>();
      for (const t of trades) {
        if (!ymMap.has(t.deal_ym)) ymMap.set(t.deal_ym, { T: 0, J: 0, W: 0 });
        const m = ymMap.get(t.deal_ym)!;
        if (t.deal_type === 'T') m.T++;
        else if (t.deal_type === 'J') m.J++;
        else m.W++;
      }
      rows = [...ymMap.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([deal_ym, v]) => ({
        deal_ym, trade_cnt: v.T, jeonse_cnt: v.J, wolse_cnt: v.W,
      }));
    }
  }

  const res = NextResponse.json({ data: rows });
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res;
}
