export type UnsoldItem = {
  sido: string;
  sigungu: string;
  value: number;
  period: string;
};

export type UnsoldData = {
  items: UnsoldItem[];
  basePeriod: string;
};

export async function getUnsoldData(): Promise<UnsoldData> {
  const apiKey = process.env.KOSIS_API_KEY;
  if (!apiKey || apiKey === '여기에_발급받은_키_입력') {
    return { items: [], basePeriod: '' };
  }

  const params = new URLSearchParams({
    method: 'getList',
    apiKey,
    orgId: '101',
    tblId: 'DT_1YL202001E',
    objL1: 'ALL',
    objL2: 'ALL',
    itmId: 'ALL',
    prdSe: 'M',
    newEstPrdCnt: '1',
    format: 'json',
    jsonVD: 'Y',
  });

  try {
    const res = await fetch(
      `https://kosis.kr/openapi/Param/statisticsParameterData.do?${params}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { items: [], basePeriod: '' };
    const json = await res.json();
    if (!Array.isArray(json)) return { items: [], basePeriod: '' };

    const basePeriod: string = json[0]?.PRD_DE ?? '';
    const items: UnsoldItem[] = json
      .filter((row: Record<string, string>) => row.DT && Number(row.DT) > 0)
      .map((row: Record<string, string>) => ({
        sido: row.C1_NM ?? '',
        sigungu: row.C2_NM ?? '',
        value: Number(row.DT) || 0,
        period: row.PRD_DE ?? '',
      }));

    return { items, basePeriod };
  } catch {
    return { items: [], basePeriod: '' };
  }
}
