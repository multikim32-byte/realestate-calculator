import { NextRequest, NextResponse } from 'next/server';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const TRADE_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

// 시군구명 → LAWD_CD
function getLawdCode(sido: string, sigungu: string): string | null {
  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
  // 완전 일치 우선
  const exact = districts.find(d => d.name === sigungu);
  if (exact) return exact.code;
  // 포함 일치
  const partial = districts.find(d => sigungu.includes(d.name) || d.name.includes(sigungu));
  return partial?.code ?? null;
}

// MOLIT XML → 거래 항목 파싱
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name    = searchParams.get('name');
  const sido    = searchParams.get('sido');
  const sigungu = searchParams.get('sigungu');
  const months  = parseInt(searchParams.get('months') ?? '24');

  if (!name || !sido || !sigungu) {
    return NextResponse.json({ error: 'name, sido, sigungu 필수' }, { status: 400 });
  }

  const lawdCode = getLawdCode(sido, sigungu);
  if (!lawdCode) {
    return NextResponse.json({ trades: [], message: '시군구 코드 없음' });
  }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) return NextResponse.json({ trades: [] });

  // 최근 N개월 조회
  const now = new Date();
  const allTrades: {
    date: string; area: number; price: number; floor: number;
    dong: string; buyerGbn: string; slerGbn: string;
    dealingGbn: string; agentSgg: string;
    rgstDate: string; cdealType: string; cdealDay: string;
  }[] = [];
  let buildYear: number | null = null;

  await Promise.all(
    Array.from({ length: months }, (_, i) => {
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

  // 날짜 내림차순 정렬
  allTrades.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ trades: allTrades, buildYear }, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
