'use client';

import { useEffect, useState } from 'react';

// ── 타입 ────────────────────────────────────────────────────────────────────

interface SpcltRow {
  // 특별공급 접수현황
  HOUSE_TY?: string;           // 주택형
  SUPLY_HSHLDCO?: string;      // 공급세대수
  REGION_NM?: string;          // 지역
  DAUMY_FMLLY_AT?: string;     // 다자녀가구
  NEWMARRWDS_AT?: string;      // 신혼부부
  FIRST_LLIFE_AT?: string;     // 생애최초
  YOUNG_AT?: string;           // 청년
  PRNTPSPPRT_AT?: string;      // 노부모부양
  NWBBNN_AT?: string;          // 신생아(일반형)
  INSTT_RECOMEND_AT?: string;  // 기관추천
  BEFSS_AT?: string;           // 이전기관
  [key: string]: string | undefined;
}

interface RatioRow {
  // 주택형별 경쟁률
  HOUSE_TY?: string;           // 주택형
  SUPLY_HSHLDCO?: string;      // 공급세대수
  ORDER?: string;              // 순위
  REGION_NM?: string;          // 지역 (해당지역/기타지역)
  RCEPT_CNT?: string;          // 점수건수
  RANK_RATIO?: string;         // 순위내 경쟁률
  SUPLY_RESULT?: string;       // 청약결과
  AREA_LTTOT_TOP_SCORE?: string;   // 당첨가점 지역
  MIN_SCORE?: string;          // 최저가점
  MAX_SCORE?: string;          // 최고가점
  AVG_SCORE?: string;          // 평균가점
  [key: string]: string | undefined;
}

interface Props {
  houseManageNo: string;
  pblancNo: string;
  status: string;  // '청약중' | '당첨발표' | '완판' | ...
}

// ── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function CompetitionRateSection({ houseManageNo, pblancNo, status }: Props) {
  const [spclt, setSpclt] = useState<SpcltRow[]>([]);
  const [ratio, setRatio] = useState<RatioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'spclt' | 'ratio'>('ratio');
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!houseManageNo || !pblancNo) { setLoading(false); return; }

    fetch(`/api/sale/ratio?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`)
      .then(r => r.json())
      .then(data => {
        if (data.source === 'no_key') { setLoading(false); return; }
        const s = data.spclt ?? [];
        const r = data.ratio ?? [];
        setSpclt(s);
        setRatio(r);
        setHasData(s.length > 0 || r.length > 0);
        // 데이터에 따라 기본 탭 결정
        if (r.length > 0) setTab('ratio');
        else if (s.length > 0) setTab('spclt');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [houseManageNo, pblancNo]);

  // 청약예정이거나 데이터 없으면 숨김
  if (!loading && !hasData) return null;

  // ── 특별공급 접수현황 테이블 그룹화 ──────────────────────────────────────
  // HOUSE_TY 기준으로 그룹화
  const spcltGroups = spclt.reduce<Record<string, SpcltRow[]>>((acc, row) => {
    const ty = row.HOUSE_TY ?? '-';
    if (!acc[ty]) acc[ty] = [];
    acc[ty].push(row);
    return acc;
  }, {});

  // ── 경쟁률 테이블 그룹화 (주택형 → 순위 → 지역) ──────────────────────────
  const ratioGroups = ratio.reduce<Record<string, Record<string, RatioRow[]>>>((acc, row) => {
    const ty = row.HOUSE_TY ?? '-';
    const ord = row.ORDER ?? '-';
    if (!acc[ty]) acc[ty] = {};
    if (!acc[ty][ord]) acc[ty][ord] = [];
    acc[ty][ord].push(row);
    return acc;
  }, {});

  const spcltCols = [
    { key: 'DAUMY_FMLLY_AT',   label: '다자녀' },
    { key: 'NEWMARRWDS_AT',    label: '신혼부부' },
    { key: 'FIRST_LLIFE_AT',   label: '생애최초' },
    { key: 'YOUNG_AT',         label: '청년' },
    { key: 'PRNTPSPPRT_AT',    label: '노부모' },
    { key: 'NWBBNN_AT',        label: '신생아' },
    { key: 'INSTT_RECOMEND_AT',label: '기관추천' },
    { key: 'BEFSS_AT',         label: '이전기관' },
  ];

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
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
          경쟁률 데이터를 불러오는 중...
        </div>
      )}

      {!loading && hasData && (
        <>
          {/* 탭 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {ratio.length > 0 && (
              <button
                onClick={() => setTab('ratio')}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: tab === 'ratio' ? '#1d4ed8' : '#f1f5f9',
                  color: tab === 'ratio' ? 'white' : '#475569',
                }}
              >
                순위별 경쟁률
              </button>
            )}
            {spclt.length > 0 && (
              <button
                onClick={() => setTab('spclt')}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: tab === 'spclt' ? '#1d4ed8' : '#f1f5f9',
                  color: tab === 'spclt' ? 'white' : '#475569',
                }}
              >
                특별공급 접수현황
              </button>
            )}
          </div>

          {/* ── 순위별 경쟁률 ── */}
          {tab === 'ratio' && ratio.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(ratioGroups).map(([ty, orders]) => (
                <div key={ty} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  {/* 주택형 헤더 */}
                  <div style={{ background: '#f0f9ff', padding: '10px 16px', fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>
                    {ty}
                  </div>
                  {Object.entries(orders).map(([ord, rows]) => (
                    <div key={ord}>
                      {/* 순위 소헤더 */}
                      <div style={{ background: '#f8fafc', padding: '6px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderTop: '1px solid #f1f5f9' }}>
                        {ord}순위
                      </div>
                      {rows.map((row, i) => {
                        const ratio = row.RANK_RATIO ?? '-';
                        const isHighRatio = parseFloat(ratio) >= 10;
                        const isMiss = ratio.startsWith('△') || parseFloat(ratio) < 1;
                        return (
                          <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr 1fr',
                            padding: '10px 16px',
                            borderTop: '1px solid #f9fafb',
                            alignItems: 'center',
                            fontSize: 13,
                            background: i % 2 === 0 ? '#fff' : '#fafafa',
                          }}>
                            <div style={{ color: '#374151' }}>{row.REGION_NM ?? '-'}</div>
                            <div style={{ textAlign: 'center', color: '#6b7280' }}>
                              {row.RCEPT_CNT ?? '-'}건
                            </div>
                            <div style={{ textAlign: 'center', fontWeight: 700,
                              color: isMiss ? '#9ca3af' : isHighRatio ? '#dc2626' : '#1d4ed8'
                            }}>
                              {ratio === '-' ? '-' : isMiss ? `미달(${ratio})` : `${ratio}:1`}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                              {row.SUPLY_RESULT || '결과발표 전'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* 당첨가점 (첫번째 1순위 해당지역 기준) */}
                  {(() => {
                    const ref = orders['1']?.find(r => r.AREA_LTTOT_TOP_SCORE || r.MIN_SCORE);
                    if (!ref || !ref.MIN_SCORE) return null;
                    return (
                      <div style={{ background: '#fef9c3', padding: '8px 16px', fontSize: 12, color: '#854d0e', display: 'flex', gap: 16 }}>
                        <span>당첨가점 (해당지역 1순위)</span>
                        <span>최저 <strong>{ref.MIN_SCORE}점</strong></span>
                        <span>최고 <strong>{ref.MAX_SCORE}점</strong></span>
                        <span>평균 <strong>{ref.AVG_SCORE}점</strong></span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          {/* ── 특별공급 접수현황 ── */}
          {tab === 'spclt' && spclt.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(spcltGroups).map(([ty, rows]) => (
                <div key={ty} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#f0fdf4', padding: '10px 16px', fontWeight: 700, fontSize: 14, color: '#065f46' }}>
                    {ty}
                  </div>
                  {rows.map((row, i) => (
                    <div key={i} style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{row.REGION_NM} · 공급 {row.SUPLY_HSHLDCO}세대</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                        {spcltCols.map(col => {
                          const val = row[col.key];
                          if (!val || val === '0') return null;
                          return (
                            <div key={col.key} style={{ fontSize: 13 }}>
                              <span style={{ color: '#9ca3af' }}>{col.label} </span>
                              <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{val}건</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#9ca3af' }}>
            ※ 출처: 청약홈 (한국부동산원) · 당첨가점은 발표일 이후 공개됩니다.
          </p>
        </>
      )}
    </div>
  );
}
