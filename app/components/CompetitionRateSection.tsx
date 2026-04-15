'use client';

import { useEffect, useState } from 'react';

interface RatioRow {
  주택관리번호?: string;
  공고번호?: string;
  모델번호?: string;
  주택형?: string;
  공급세대수?: string;
  순위?: string;
  거주코드?: string;
  거주지역?: string;
  접수건수?: string;
  경쟁률?: string;
}

interface Props {
  houseManageNo: string;
  pblancNo: string;
  status: string;
  buildingType?: string;
}

function RatioBar({ ratio }: { ratio: string }) {
  const val = parseFloat(ratio);
  if (isNaN(val)) return <span style={{ color: '#9ca3af' }}>-</span>;
  const isMiss   = val < 1;
  const isHigh   = val >= 10;
  const isMedium = val >= 3;
  const color = isMiss ? '#9ca3af' : isHigh ? '#dc2626' : isMedium ? '#d97706' : '#1d4ed8';
  const label = isMiss ? `미달 (${ratio})` : `${ratio} : 1`;
  return (
    <span style={{ fontWeight: 800, color, fontSize: 15 }}>{label}</span>
  );
}

function getApplyhomeUrl(buildingType?: string) {
  if (!buildingType) return 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do';
  const t = buildingType.trim();
  if (t.includes('잔여') || t.includes('잔여세대')) {
    return 'https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancListView.do';
  }
  if (t.includes('오피스텔') || t.includes('도시형') || t.includes('민간임대') || t.includes('생활주택')) {
    return 'https://www.applyhome.co.kr/ai/aia/selectOtherLttotPblancListView.do';
  }
  return 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do';
}

export default function CompetitionRateSection({ houseManageNo, pblancNo, status, buildingType }: Props) {
  const [rows, setRows]       = useState<RatioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!houseManageNo) { setLoading(false); return; }

    fetch(`/api/sale/ratio?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`)
      .then(r => r.json())
      .then(data => {
        if (data.source === 'no_key') return;
        const list: RatioRow[] = data.ratio ?? [];
        setRows(list);
        setHasData(list.length > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [houseManageNo, pblancNo]);

  // 데이터 없으면 청약홈 링크 버튼으로 대체
  if (!loading && !hasData) {
    return (
      <div style={{ marginTop: 16 }}>
        <a
          href={getApplyhomeUrl(buildingType)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
            background: '#fff', color: '#374151', textDecoration: 'none',
            border: '1px solid #d1d5db',
          }}
        >
          🏆 신청현황 · 경쟁률 확인 (청약홈)
        </a>
      </div>
    );
  }

  // 주택형 → 순위 → 지역 그룹화
  const grouped = rows.reduce<Record<string, Record<string, RatioRow[]>>>((acc, row) => {
    const ty  = row.주택형  ?? '-';
    const ord = row.순위    ?? '-';
    if (!acc[ty]) acc[ty] = {};
    if (!acc[ty][ord]) acc[ty][ord] = [];
    acc[ty][ord].push(row);
    return acc;
  }, {});

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
          🏆 청약 경쟁률
        </h2>
        {status === '청약중' && (
          <span style={{ fontSize: 12, color: '#059669', background: '#d1fae5', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            청약 마감 후 저녁 8시경 업데이트
          </span>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>
          경쟁률 데이터를 불러오는 중...
        </div>
      )}

      {!loading && hasData && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(grouped).map(([ty, orders]) => (
              <div key={ty} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {/* 주택형 헤더 */}
                <div style={{ background: '#f0f9ff', padding: '10px 16px', fontWeight: 700, fontSize: 14, color: '#1e3a8a', borderBottom: '1px solid #e0f2fe' }}>
                  {ty}
                </div>

                {/* 순위별 행 */}
                {['1', '2'].map(ord => {
                  const regionRows = orders[ord];
                  if (!regionRows || regionRows.length === 0) return null;
                  return (
                    <div key={ord}>
                      <div style={{ background: '#f8fafc', padding: '6px 16px', fontSize: 12, color: '#64748b', fontWeight: 700, borderTop: '1px solid #f1f5f9' }}>
                        {ord}순위
                      </div>
                      {regionRows.map((row, i) => (
                        <div key={i} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 1fr',
                          padding: '12px 16px',
                          borderTop: '1px solid #f9fafb',
                          alignItems: 'center',
                          background: i % 2 === 0 ? '#fff' : '#fafafa',
                          gap: 8,
                        }}>
                          <div style={{ fontSize: 13, color: '#374151' }}>
                            {row.거주지역 ?? '-'}
                          </div>
                          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                            {row.접수건수 ?? '-'}건
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <RatioBar ratio={row.경쟁률 ?? ''} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#9ca3af' }}>
            ※ 출처: 한국부동산원 청약홈 · 청약 마감일 이후 순차 공개됩니다.
          </p>
        </>
      )}
    </div>
  );
}
