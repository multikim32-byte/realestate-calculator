'use client';

import { useEffect, useState, startTransition } from 'react';

type RatioRow = {
  주택형?: string;
  순위?: string | number;
  거주지역?: string;
  접수건수?: string | number;
  공급세대수?: string | number;
  경쟁률?: string | number;
  [key: string]: unknown;
};

interface Props {
  houseManageNo: string;
  pblancNo: string;
  status: string;
  buildingType?: string;
  recruitType?: string;
}

// 해당 단지 청약홈 직접 링크 (목록 → 상세 페이지)
function getApplyhomeUrl(buildingType?: string, recruitType?: string, houseManageNo?: string, pblancNo?: string) {
  if (houseManageNo && pblancNo) {
    if (recruitType === '선착순') {
      return `https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancDetail.do?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`;
    }
    const t = buildingType?.trim() ?? '';
    if (t.includes('오피스텔') || t.includes('도시형') || t.includes('민간임대') || t.includes('생활주택')) {
      return `https://www.applyhome.co.kr/ai/aia/selectUrbtyOfctlLttotPblancDetail.do?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`;
    }
    return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`;
  }
  // 폴백: 목록 페이지
  if (recruitType === '선착순') return 'https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancListView.do';
  return 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do';
}

function fmt(v: string | number | undefined) {
  if (v === undefined || v === null || v === '') return '-';
  return String(v);
}

function fmtRate(v: string | number | undefined) {
  if (v === undefined || v === null || v === '') return '-';
  const s = String(v);
  if (s.startsWith('(△') || s.startsWith('(▲')) {
    const n = s.replace(/[()△▲]/g, '');
    return `미달 (${n})`;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  return `${n.toFixed(2)} : 1`;
}

type TypeSummary = {
  type: string;
  supply: number;
  apply: number;
  rate: number | null;  // null = 미달
};

function toNum(v: string | number | undefined): number {
  if (v === undefined || v === null || v === '') return 0;
  return parseInt(String(v).replace(/[^0-9]/g, '')) || 0;
}

function computeSummaries(grouped: Record<string, RatioRow[]>): TypeSummary[] {
  return Object.entries(grouped).map(([type, rows]) => {
    // 1순위 행만 (없으면 전체)
    const r1 = rows.filter(r => String(r.순위) === '1' || r.순위 === 1);
    const base = r1.length > 0 ? r1 : rows;
    const supply = toNum(base[0]?.공급세대수);
    const apply  = base.reduce((s, r) => s + toNum(r.접수건수), 0);
    const rate   = supply > 0 ? apply / supply : null;
    return { type, supply, apply, rate };
  });
}

function rateColor(rate: number | null): { bg: string; color: string; border: string } {
  if (rate === null || rate < 1) return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  if (rate >= 10) return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
  if (rate >= 5)  return { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' };
  if (rate >= 2)  return { bg: '#fefce8', color: '#854d0e', border: '#fde68a' };
  return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
}

function rateLabel(rate: number | null): string {
  if (rate === null || rate < 1) return '미달';
  return `${rate.toFixed(2)} : 1`;
}

export default function CompetitionRateSection({ houseManageNo, pblancNo, buildingType, recruitType }: Props) {
  const [rows, setRows] = useState<RatioRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !houseManageNo) return;
    if (rows !== null) return; // 이미 불러옴
    startTransition(() => setLoading(true));
    fetch(`/api/sale/ratio?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`)
      .then(r => r.json())
      .then(data => setRows(data.ratio ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, houseManageNo, pblancNo, rows]);

  // 주택형별로 그룹핑
  const grouped: Record<string, RatioRow[]> = {};
  if (rows) {
    for (const row of rows) {
      const ty = row.주택형 ?? '기타';
      if (!grouped[ty]) grouped[ty] = [];
      grouped[ty].push(row);
    }
  }
  const hasData = rows && rows.length > 0;
  const summaries = hasData ? computeSummaries(grouped) : [];

  return (
    <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* 헤더 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Apple SD Gothic Neo', sans-serif",
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          🏆 신청현황 · 경쟁률
        </span>
        <span style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          {open ? '접기 ▲' : '펼쳐보기 ▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 14 }}>
              데이터를 불러오는 중...
            </div>
          )}

          {!loading && !hasData && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6b7280' }}>아직 경쟁률 데이터가 없습니다.</p>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#9ca3af' }}>청약 접수 후 오후 7~8시경 공개됩니다.</p>
              <a
                href={getApplyhomeUrl(buildingType, recruitType, houseManageNo, pblancNo)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#f3f4f6', color: '#374151', textDecoration: 'none', border: '1px solid #e5e7eb',
                }}
              >
                청약홈에서 직접 확인 →
              </a>
            </div>
          )}

          {!loading && hasData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── 평형별 경쟁률 요약 ── */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  📊 평형별 경쟁률 요약 (1순위 기준)
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['주택형', '공급세대', '총 접수', '1순위 경쟁률'].map(h => (
                          <th key={h} style={{
                            padding: '8px 10px', textAlign: 'center', fontWeight: 700,
                            color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map(s => {
                        const c = rateColor(s.rate);
                        return (
                          <tr key={s.type} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                              {s.type}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#374151' }}>
                              {s.supply.toLocaleString()}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#374151' }}>
                              {s.apply.toLocaleString()}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px', borderRadius: 20,
                                fontSize: 12, fontWeight: 700,
                                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                              }}>
                                {rateLabel(s.rate)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── 순위·지역별 상세 ── */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                  📋 순위·거주지역별 상세
                </div>
              </div>
              {Object.entries(grouped).map(([type, typeRows]) => (
                <div key={type}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: '#1d4ed8',
                    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ background: '#eff6ff', padding: '2px 10px', borderRadius: 20 }}>주택형 {type}</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          {['순위', '거주지역', '공급세대', '접수건수', '경쟁률'].map(h => (
                            <th key={h} style={{
                              padding: '8px 10px', textAlign: 'center', fontWeight: 700,
                              color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {typeRows.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>{fmt(row.순위)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#374151' }}>{fmt(row.거주지역)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#374151' }}>{fmt(row.공급세대수)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#374151' }}>{fmt(row.접수건수)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: parseFloat(String(row.경쟁률 ?? 0)) >= 1 ? '#065f46' : '#374151' }}>
                              {fmtRate(row.경쟁률)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'right', marginTop: 4 }}>
                <a
                  href={getApplyhomeUrl(buildingType, recruitType, houseManageNo, pblancNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}
                >
                  청약홈에서 전체 보기 →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
