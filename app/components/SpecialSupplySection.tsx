'use client';

import { useEffect, useState } from 'react';

type SpsplyRow = {
  주택형: string;
  공급세대수: number;
  청약결과: string;
  배정: Record<string, number>;
  기관추천배정: number;
  이전기관배정: number;
  해당지역: Record<string, number>;
  기타지역: Record<string, number>;
  기관합산: string;
};

const COLS = ['다자녀', '신혼부부', '생애최초', '청년', '노부모부양', '신생아'] as const;
const COL_SHORT: Record<string, string> = {
  다자녀: '다자녀', 신혼부부: '신혼', 생애최초: '생애최초', 청년: '청년', 노부모부양: '노부모', 신생아: '신생아',
};

interface Props {
  houseManageNo: string;
  pblancNo: string;
}

export default function SpecialSupplySection({ houseManageNo, pblancNo }: Props) {
  const [rows, setRows] = useState<SpsplyRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !houseManageNo) return;
    if (rows !== null) return;
    setLoading(true);
    fetch(`/api/sale/spsply?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`)
      .then(r => r.json())
      .then(d => setRows(d.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, houseManageNo, pblancNo, rows]);

  const hasData = rows && rows.length > 0;

  return (
    <div style={{ marginTop: 16, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Apple SD Gothic Neo', sans-serif",
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
          특별공급 신청현황
        </span>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{open ? '접기 ▲' : '펼쳐보기 ▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 14 }}>
              데이터를 불러오는 중...
            </div>
          )}

          {!loading && !hasData && (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: '16px 0' }}>
              특별공급 신청현황 데이터가 없습니다.
            </p>
          )}

          {!loading && hasData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rows!.map((row) => (
                <div key={row.주택형} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {/* 주택형 헤더 */}
                  <div style={{ padding: '8px 14px', background: '#f0fdf4', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>주택형</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>{row.주택형}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>공급 {row.공급세대수}세대</span>
                    {row.청약결과 && (
                      <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>
                        {row.청약결과}
                      </span>
                    )}
                  </div>

                  {/* 표 */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>구분</th>
                          {COLS.map(c => (
                            <th key={c} style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                              {COL_SHORT[c]}
                            </th>
                          ))}
                          <th style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>기관</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 배정 */}
                        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>배정</td>
                          {COLS.map(c => (
                            <td key={c} style={{ padding: '7px 8px', textAlign: 'center', color: '#374151' }}>{row.배정[c] ?? 0}</td>
                          ))}
                          <td style={{ padding: '7px 8px', textAlign: 'center', color: '#374151' }}>{row.기관추천배정}</td>
                        </tr>
                        {/* 해당지역 */}
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', whiteSpace: 'nowrap' }}>해당지역</td>
                          {COLS.map(c => (
                            <td key={c} style={{ padding: '7px 8px', textAlign: 'center', color: '#374151' }}>{row.해당지역[c] ?? 0}</td>
                          ))}
                          <td style={{ padding: '7px 8px', textAlign: 'center', color: '#374151', fontSize: 11 }}>{row.기관합산 || '-'}</td>
                        </tr>
                        {/* 기타지역 */}
                        <tr>
                          <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', whiteSpace: 'nowrap' }}>기타지역</td>
                          {COLS.map(c => (
                            <td key={c} style={{ padding: '7px 8px', textAlign: 'center', color: '#374151' }}>{row.기타지역[c] ?? 0}</td>
                          ))}
                          <td style={{ padding: '7px 8px', textAlign: 'center', color: '#9ca3af' }}>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
