import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getLawdCode(sido: string, sigungu: string): string | null {
  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
  const norm = (s: string) => s.replace(/\s+/g, '');
  const ns = norm(sigungu);
  const exact = districts.find(d => norm(d.name) === ns);
  if (exact) return exact.code;
  const partial = districts.find(d => { const nd = norm(d.name); return ns.includes(nd) || nd.includes(ns); });
  return partial?.code ?? null;
}

function normName(s: string) {
  return (s ?? '').replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
}
function matchName(a: string, b: string) {
  const na = normName(a), nb = normName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name     = searchParams.get('name');
  const sido     = searchParams.get('sido');
  const sigungu  = searchParams.get('sigungu');
  const kaptCode = searchParams.get('kapt_code');
  const months   = parseInt(searchParams.get('months') ?? '24');

  if (!name || !sido || !sigungu) {
    return NextResponse.json({ error: 'name, sido, sigungu 필수' }, { status: 400 });
  }

  // sido 표기 차이(경기/경기도 등)로 실패할 수 있음 — kaptCode가 있으면 molit_key로 lawd 확보
  const lawdCode = getLawdCode(sido, sigungu);

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const fromYm = `${fromDate.getFullYear()}${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  // ── apt_trades Supabase 조회 (전세 J + 월세 W) ───────────────────────────────
  try {
    const supabase = db();

    let molitAptNames: string[] | null = null; // 띄어쓰기 변형·차수 분리 통합 매칭
    let molitLawdCd = lawdCode;

    if (kaptCode) {
      const { data: cx } = await supabase
        .from('apartment_complexes')
        .select('molit_key')
        .eq('kapt_code', kaptCode)
        .maybeSingle();
      if (cx?.molit_key) {
        const [lc, an] = cx.molit_key.split('|');
        molitLawdCd = lc;
        // 같은 lawd + 정규화 이름이 같은 모든 단지의 apt_name 변형 수집 (띄어쓰기 차이 통합)
        const targetNorm = normName(an);
        const { data: sib } = await supabase
          .from('apartment_complexes')
          .select('molit_key')
          .like('molit_key', `${lc}|%`);
        const variants = new Set([an]);
        for (const s of sib ?? []) {
          const sn = (s.molit_key as string)?.split('|')[1];
          if (sn && normName(sn) === targetNorm) variants.add(sn);
        }
        molitAptNames = [...variants];
      }
    }

    if (!molitLawdCd) {
      return NextResponse.json({ trades: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let query = supabase
      .from('apt_trades')
      .select('deal_ym, deal_day, exclusive_area, price, monthly_rent, floor, dong, apt_name, deal_type')
      .eq('lawd_cd', molitLawdCd)
      .in('deal_type', ['J', 'W'])
      .gte('deal_ym', fromYm)
      .order('deal_ym', { ascending: false })
      .limit(3000);

    if (molitAptNames?.length) {
      query = query.in('apt_name', molitAptNames) as typeof query;
    }

    const { data, error } = await query;

    if (error || !data) {
      return NextResponse.json({ trades: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const matched = molitAptNames?.length
      ? data
      : data.filter(t => matchName(t.apt_name ?? '', name));

    const trades = matched.map(t => ({
      date: `${String(t.deal_ym).slice(0, 4)}-${String(t.deal_ym).slice(4, 6)}-${String(t.deal_day ?? 1).padStart(2, '0')}`,
      area: parseFloat(t.exclusive_area),
      floor: t.floor ?? 0,
      deposit: t.price ?? 0,
      monthly: t.monthly_rent ?? 0,
      contractType: '',
      contractEnd: '',
      useRRRight: '',
      preDeposit: 0,
      preMonthly: 0,
    }));
    trades.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ trades }, {
      headers: { 'Cache-Control': trades.length ? 'public, max-age=86400' : 'public, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ trades: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
