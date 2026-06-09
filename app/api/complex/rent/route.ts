import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const RENT_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getLawdCode(sido: string, sigungu: string): string | null {
  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
  const exact = districts.find(d => d.name === sigungu);
  if (exact) return exact.code;
  const partial = districts.find(d => sigungu.includes(d.name) || d.name.includes(sigungu));
  return partial?.code ?? null;
}

function parseTermEnd(term: string): string {
  const end = term.split('~')[1]?.trim();
  if (!end) return '';
  const [yy, mm] = end.split('.');
  if (!yy || !mm) return '';
  const year = parseInt(yy) + (parseInt(yy) < 50 ? 2000 : 1900);
  return `${year}-${mm.padStart(2, '0')}-01`;
}

function parseRentXml(xml: string, aptName: string) {
  const items: {
    date: string; area: number; floor: number; deposit: number; monthly: number;
    contractType: string; contractEnd: string; useRRRight: string;
    preDeposit: number; preMonthly: number;
  }[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };
    const name = get('aptNm');
    if (!name.includes(aptName) && !aptName.includes(name)) continue;
    const year    = get('dealYear');
    const month   = get('dealMonth').padStart(2, '0');
    const day     = get('dealDay').padStart(2, '0');
    const area    = parseFloat(get('excluUseAr')) || 0;
    const floor   = parseInt(get('floor')) || 0;
    const deposit = parseInt((get('deposit') || '0').replace(/,/g, '')) || 0;
    const monthly = parseInt((get('monthlyRent') || '0').replace(/,/g, '')) || 0;
    const contractType = get('contractType') || '';
    const contractEnd  = parseTermEnd(get('contractTerm'));
    const useRRRight   = get('useRRRight') || '';
    const preDeposit   = parseInt((get('preDeposit') || '0').replace(/,/g, '')) || 0;
    const preMonthly   = parseInt((get('preMonthlyRent') || '0').replace(/,/g, '')) || 0;
    if (!year || !area) continue;
    items.push({ date: `${year}-${month}-${day}`, area, floor, deposit, monthly, contractType, contractEnd, useRRRight, preDeposit, preMonthly });
  }
  return items;
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

  const lawdCode = getLawdCode(sido, sigungu);
  if (!lawdCode) return NextResponse.json({ trades: [] });

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const fromYm = `${fromDate.getFullYear()}${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  // ── apt_trades Supabase 조회 (전세 J + 월세 W) ───────────────────────────────
  try {
    const supabase = db();

    let molitAptName: string | null = null;
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
        molitAptName = an;
      }
    }

    let query = supabase
      .from('apt_trades')
      .select('deal_ym, deal_day, exclusive_area, price, monthly_rent, floor, dong, apt_name, deal_type')
      .eq('lawd_cd', molitLawdCd)
      .in('deal_type', ['J', 'W'])
      .gte('deal_ym', fromYm)
      .order('deal_ym', { ascending: false })
      .limit(3000);

    if (molitAptName) {
      query = query.eq('apt_name', molitAptName) as typeof query;
    }

    const { data, error } = await query;

    if (!error && data) {
      const matched = molitAptName
        ? data
        : data.filter(t => matchName(t.apt_name ?? '', name));

      if (matched.length >= 3) {
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
          headers: { 'Cache-Control': 'public, max-age=86400' },
        });
      }
    }
  } catch { /* MOLIT API fallback */ }

  // ── MOLIT API fallback ───────────────────────────────────────────────────────
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) return NextResponse.json({ trades: [] });

  const fallbackMonths = Math.min(months, 12);
  const allTrades: {
    date: string; area: number; floor: number; deposit: number; monthly: number;
    contractType: string; contractEnd: string; useRRRight: string;
    preDeposit: number; preMonthly: number;
  }[] = [];

  await Promise.all(
    Array.from({ length: fallbackMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      return fetchWithTimeout(
        `${RENT_URL}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCode}&DEAL_YMD=${ym}&numOfRows=1000`,
        { next: { revalidate: 86400 } },
        10000,
      )
        .then(r => r.text())
        .then(xml => { allTrades.push(...parseRentXml(xml, name)); })
        .catch(() => {});
    })
  );

  allTrades.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ trades: allTrades }, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
