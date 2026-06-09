import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

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

function parseXml(xml: string, aptName: string) {
  const items: {
    date: string; area: number; price: number; floor: number;
    dong: string; buyerGbn: string; slerGbn: string;
    dealingGbn: string; agentSgg: string;
    rgstDate: string; cdealType: string; cdealDay: string;
  }[] = [];
  let buildYear: number | null = null;
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };
    const name = get('aptNm');
    if (!name.includes(aptName) && !aptName.includes(name)) continue;
    const year  = get('dealYear');
    const month = get('dealMonth').padStart(2, '0');
    const day   = get('dealDay').padStart(2, '0');
    const price = parseInt(get('dealAmount').replace(/,/g, '')) || 0;
    const area  = parseFloat(get('excluUseAr')) || 0;
    const floor = parseInt(get('floor')) || 0;
    const by    = parseInt(get('buildYear')) || 0;
    if (by > 1900 && !buildYear) buildYear = by;
    if (!year || !price || !area) continue;
    items.push({
      date: `${year}-${month}-${day}`, area, price, floor,
      dong:       get('aptDong'),
      buyerGbn:   get('buyerGbn'),
      slerGbn:    get('slerGbn'),
      dealingGbn: get('dealingGbn'),
      agentSgg:   get('estateAgentSggNm'),
      rgstDate:   get('rgstDate'),
      cdealType:  get('cdealType'),
      cdealDay:   get('cdealDay'),
    });
  }
  return { items, buildYear };
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

  const lawdCode = getLawdCode(sido, sigungu);
  if (!lawdCode) return NextResponse.json({ trades: [], message: '시군구 코드 없음' });

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const fromYm = `${fromDate.getFullYear()}${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

  // ── apt_trades Supabase 조회 ─────────────────────────────────────────────────
  try {
    const supabase = db();

    // kapt_code로 molit_key 조회 → 정확한 apt_name 매칭
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
      .select('deal_ym, deal_day, exclusive_area, price, floor, dong, apt_name')
      .eq('lawd_cd', molitLawdCd)
      .eq('deal_type', 'T')
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
          price: t.price,
          floor: t.floor ?? 0,
          dong: t.dong ?? '',
        }));
        trades.sort((a, b) => b.date.localeCompare(a.date));
        return NextResponse.json({ trades }, {
          headers: { 'Cache-Control': 'public, max-age=86400' },
        });
      }
    }
  } catch { /* MOLIT API fallback */ }

  // ── MOLIT API fallback (단지 신규 or apt_trades 없을 때) ─────────────────────
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) return NextResponse.json({ trades: [] });

  const fallbackMonths = Math.min(months, 24);
  const allTrades: {
    date: string; area: number; price: number; floor: number;
    dong: string; buyerGbn: string; slerGbn: string;
    dealingGbn: string; agentSgg: string;
    rgstDate: string; cdealType: string; cdealDay: string;
  }[] = [];
  let buildYear: number | null = null;

  await Promise.all(
    Array.from({ length: fallbackMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      return fetchWithTimeout(
        `${TRADE_URL}?serviceKey=${encodeURIComponent(apiKey)}&LAWD_CD=${lawdCode}&DEAL_YMD=${ym}&numOfRows=1000`,
        { next: { revalidate: 86400 } },
        10000,
      )
        .then(r => r.text())
        .then(xml => {
          const { items, buildYear: by } = parseXml(xml, name);
          allTrades.push(...items);
          if (by && !buildYear) buildYear = by;
        })
        .catch(() => {});
    })
  );

  allTrades.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ trades: allTrades, buildYear }, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
