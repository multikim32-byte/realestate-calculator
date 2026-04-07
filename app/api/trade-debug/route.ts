import { NextResponse } from 'next/server';

const BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

async function getCount(key: string, code: string, ym: string): Promise<number> {
  try {
    const url = `${BASE}?serviceKey=${key}&pageNo=1&numOfRows=1&LAWD_CD=${code}&DEAL_YMD=${ym}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    return parseInt(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? '0');
  } catch { return -1; }
}

async function getDongs(key: string, code: string, ym: string): Promise<string[]> {
  try {
    const url = `${BASE}?serviceKey=${key}&pageNo=1&numOfRows=5&LAWD_CD=${code}&DEAL_YMD=${ym}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    return [...new Set([...text.matchAll(/<umdNm>(.*?)<\/umdNm>/g)].map(m => m[1].trim()))];
  } catch { return []; }
}

export async function GET() {
  const key = process.env.MOLIT_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: 'NO_KEY' });

  const MONTHS = ['202601', '202602', '202603'];

  const [경기결과, 전북결과, 부천결과] = await Promise.all([
    // 경기 대도시 — 3개월 합산으로 확인
    Promise.all([
      { label: '파주시(41480)', code: '41480' },
      { label: '의왕시(41430)', code: '41430' },
      { label: '광주시(41610)', code: '41610' },
    ].map(async ({ label, code }) => {
      const counts = await Promise.all(MONTHS.map(m => getCount(key, code, m)));
      return { label, code, counts: Object.fromEntries(MONTHS.map((m, i) => [m, counts[i]])), total: counts.reduce((a, b) => a + b, 0) };
    })),

    // 전북 45xxx vs 52xxx
    Promise.all([
      { label: '전주 완산구', old: '52111', new45: '45111' },
      { label: '전주 덕진구', old: '52113', new45: '45113' },
      { label: '군산시',      old: '52130', new45: '45130' },
      { label: '익산시',      old: '52140', new45: '45140' },
      { label: '정읍시',      old: '52180', new45: '45180' },
      { label: '남원시',      old: '52190', new45: '45190' },
      { label: '김제시',      old: '52210', new45: '45210' },
      { label: '완주군',      old: '52710', new45: '45710' },
      { label: '고창군',      old: '52790', new45: '45790' },
      { label: '부안군',      old: '52800', new45: '45800' },
    ].map(async ({ label, old, new45 }) => {
      const [c52, c45] = await Promise.all([
        getCount(key, old, '202602'),
        getCount(key, new45, '202602'),
      ]);
      return { label, '52xxx': c52, '45xxx': c45 };
    })),

    // 부천 구 이름 확인
    Promise.all([
      { code: '41192' }, { code: '41194' }, { code: '41196' },
    ].map(async ({ code }) => {
      const dongs = await getDongs(key, code, '202602');
      return { code, dongs };
    })),
  ]);

  return NextResponse.json({ 경기대도시: 경기결과, 전북코드비교: 전북결과, 부천구이름: 부천결과 });
}
