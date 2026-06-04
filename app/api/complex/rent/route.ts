import { NextRequest, NextResponse } from 'next/server';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const RENT_URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

function getLawdCode(sido: string, sigungu: string): string | null {
  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
  const exact = districts.find(d => d.name === sigungu);
  if (exact) return exact.code;
  const partial = districts.find(d => sigungu.includes(d.name) || d.name.includes(sigungu));
  return partial?.code ?? null;
}

function parseRentXml(xml: string, aptName: string) {
  const items: { date: string; area: number; floor: number; deposit: number; monthly: number; contractType: string }[] = [];
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
    // MOLIT API 버전에 따라 태그명 상이 — 영문/한글 모두 시도
    const depositRaw = get('deposit') || get('보증금') || get('보증금액') || '0';
    const monthlyRaw = get('monthlyRent') || get('월세') || get('월세금액') || '0';
    const deposit = parseInt(depositRaw.replace(/,/g, '')) || 0;
    const monthly = parseInt(monthlyRaw.replace(/,/g, '')) || 0;
    // 계약구분: 신규 / 갱신 / 재계약
    const contractType = get('계약구분') || get('contractType') || '';
    if (!year || !area) continue;
    items.push({ date: `${year}-${month}-${day}`, area, floor, deposit, monthly, contractType });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name    = searchParams.get('name');
  const sido    = searchParams.get('sido');
  const sigungu = searchParams.get('sigungu');
  const months  = parseInt(searchParams.get('months') ?? '12');

  if (!name || !sido || !sigungu) {
    return NextResponse.json({ error: 'name, sido, sigungu 필수' }, { status: 400 });
  }
  const lawdCode = getLawdCode(sido, sigungu);
  if (!lawdCode) return NextResponse.json({ trades: [] });

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) return NextResponse.json({ trades: [] });

  const now = new Date();
  const allTrades: { date: string; area: number; floor: number; deposit: number; monthly: number; contractType: string }[] = [];

  await Promise.all(
    Array.from({ length: months }, (_, i) => {
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
