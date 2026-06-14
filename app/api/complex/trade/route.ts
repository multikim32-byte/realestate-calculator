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
  const months   = parseInt(searchParams.get('months') ?? '60');

  if (!name || !sido || !sigungu) {
    return NextResponse.json({ error: 'name, sido, sigungu 필수' }, { status: 400 });
  }

  // sido 표기 차이(경기/경기도 등)로 실패할 수 있음 — kaptCode가 있으면 molit_key로 lawd 확보
  const lawdCode = getLawdCode(sido, sigungu);

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const fromYm = `${fromDate.getFullYear()}${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  // ── apt_trades Supabase 조회 ─────────────────────────────────────────────────
  try {
    const supabase = db();

    // kapt_code로 molit_key + 좌표 조회 → 정확한 apt_name 매칭
    let molitAptNames: string[] | null = null; // 띄어쓰기 변형·차수 분리 통합 매칭
    let molitLawdCd = lawdCode;

    if (kaptCode) {
      const { data: cx } = await supabase
        .from('apartment_complexes')
        .select('molit_key, lat, lng')
        .eq('kapt_code', kaptCode)
        .maybeSingle();
      if (cx?.molit_key) {
        const [lc, an] = cx.molit_key.split('|');
        molitLawdCd = lc;
        // 같은 위치(±300m)의 정규화 이름이 같은 단지 apt_name 변형 수집
        // (입주권↔매매 띄어쓰기 차이 통합). molit_key LIKE는 인덱스를 못 타 느려서 좌표 bbox 사용.
        const variants = new Set([an]);
        if (cx.lat && cx.lng) {
          const targetNorm = normName(an);
          const D = 0.003; // ≈300m
          const { data: sib } = await supabase
            .from('apartment_complexes')
            .select('molit_key')
            .not('molit_key', 'is', null)
            .gte('lat', cx.lat - D).lte('lat', cx.lat + D)
            .gte('lng', cx.lng - D).lte('lng', cx.lng + D);
          for (const s of sib ?? []) {
            const [sl, sn] = (s.molit_key as string).split('|');
            if (sl === lc && sn && normName(sn) === targetNorm) variants.add(sn);
          }
        }
        molitAptNames = [...variants];
      } else if (cx?.lat && cx?.lng) {
        // molit_key 없으면 근처 M-prefix의 apt_name으로 OR 매칭
        // (차수 분리, 이름 불일치 케이스 모두 처리)
        const LAT_D = 0.005, LNG_D = 0.006; // ≈500m bbox
        const { data: nearby } = await supabase
          .from('apartment_complexes')
          .select('molit_key')
          .like('kapt_code', 'M%')
          .not('molit_key', 'is', null)
          .neq('source', 'kapt_deprecated')
          .gte('lat', cx.lat - LAT_D).lte('lat', cx.lat + LAT_D)
          .gte('lng', cx.lng - LNG_D).lte('lng', cx.lng + LNG_D);
        if (nearby?.length) {
          molitAptNames = nearby.map(m => (m.molit_key as string).split('|')[1]).filter(Boolean);
        }
      }
    }

    if (!molitLawdCd) {
      return NextResponse.json({ trades: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let query = supabase
      .from('apt_trades')
      .select('deal_ym, deal_day, exclusive_area, price, floor, dong, apt_name, deal_type, apt_dong')
      .eq('lawd_cd', molitLawdCd)
      .in('deal_type', ['T', 'N']) // N = 분양권/입주권 — 신축 단지는 매매 전 유일한 거래
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

    const exact = Boolean(molitAptNames?.length);
    const matched = exact ? data : data.filter(t => matchName(t.apt_name ?? '', name));

    const trades = matched.map(t => ({
      date: `${String(t.deal_ym).slice(0, 4)}-${String(t.deal_ym).slice(4, 6)}-${String(t.deal_day ?? 1).padStart(2, '0')}`,
      area: parseFloat(t.exclusive_area),
      price: t.price,
      floor: t.floor ?? 0,
      dong: t.dong ?? '',
      aptDong: t.apt_dong ?? '',
      presale: t.deal_type === 'N',
    }));
    trades.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ trades }, {
      headers: { 'Cache-Control': trades.length ? 'public, max-age=86400' : 'public, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ trades: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
