'use client';

import { useState, useMemo, useEffect } from 'react';
import { LAWD_CODE_MAP, recentMonths } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';
import KakaoMap from '@/app/components/KakaoMap';
import AptPriceTrendChart from '@/app/components/AptPriceTrendChart';

const SIDOS = Object.keys(LAWD_CODE_MAP) as Array<keyof typeof LAWD_CODE_MAP>;
const MONTHS = recentMonths(12);

function fmt만원(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function areaLabel(area: number) {
  const py = area / 3.305785;
  return `${area.toFixed(1)}㎡(${py.toFixed(0)}평)`;
}

export default function TradeClient() {
  const [sido, setSido] = useState<keyof typeof LAWD_CODE_MAP>('서울');
  const [lawdCd, setLawdCd] = useState('11680'); // 강남구 기본
  const [dealYmd, setDealYmd] = useState(MONTHS[1].value); // 전달 기본
  const [items, setItems] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedApt, setSelectedApt] = useState('');
  const [selectedDong, setSelectedDong] = useState('전체');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sigunguList = LAWD_CODE_MAP[sido];

  const handleSidoChange = (s: keyof typeof LAWD_CODE_MAP) => {
    setSido(s);
    setLawdCd(LAWD_CODE_MAP[s][0].code);
    setSelectedApt('');
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setSearched(true);
    setSelectedApt('');
    setSelectedDong('전체');
    try {
      const res = await fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${dealYmd}&numOfRows=200`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 동 목록 (조회 결과에서 추출)
  const dongList = useMemo(() => {
    const set = new Set(items.map(i => i.dong).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [items]);

  // 동 + 키워드 필터
  const filtered = useMemo(() => {
    return items.filter(i => {
      if (selectedDong !== '전체' && i.dong !== selectedDong) return false;
      if (keyword && !i.name.includes(keyword)) return false;
      return true;
    });
  }, [items, selectedDong, keyword]);

  // 선택 단지의 거래 내역
  const aptTrades = useMemo(() => {
    if (!selectedApt) return [];
    return filtered.filter(i => i.name === selectedApt).sort((a, b) => a.dealDate.localeCompare(b.dealDate));
  }, [filtered, selectedApt]);

  // 단지별 통계
  const aptStats = useMemo(() => {
    const map: Record<string, { count: number; min: number; max: number; sum: number; areas: Set<string> }> = {};
    filtered.forEach(i => {
      if (!map[i.name]) map[i.name] = { count: 0, min: Infinity, max: -Infinity, sum: 0, areas: new Set() };
      const s = map[i.name];
      s.count++;
      s.min = Math.min(s.min, i.price);
      s.max = Math.max(s.max, i.price);
      s.sum += i.price;
      s.areas.add(i.area.toFixed(0));
    });
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s, avg: Math.round(s.sum / s.count) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 산점도 데이터 (면적 vs 가격)

  const dealYmdLabel = MONTHS.find(m => m.value === dealYmd)?.label ?? dealYmd;
  const sigunguName = sigunguList.find(s => s.code === lawdCd)?.name ?? '';

  return (
    <div>
      {/* ── 검색 조건 ── */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* 시/도 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>시/도</label>
            <select
              value={sido}
              onChange={e => handleSidoChange(e.target.value as keyof typeof LAWD_CODE_MAP)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5eb', fontSize: 14, background: '#fff' }}
            >
              {SIDOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 시/군/구 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>시/군/구</label>
            <select
              value={lawdCd}
              onChange={e => setLawdCd(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
            >
              {sigunguList.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>

          {/* 거래월 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>거래월</label>
            <select
              value={dealYmd}
              onChange={e => setDealYmd(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* 조회 버튼 */}
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '9px 24px',
              borderRadius: 8,
              background: loading ? '#9ca3af' : '#1d4ed8',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 16, fontSize: 14 }}>
          오류: {error}
        </div>
      )}

      {/* ── 동 필터 (조회 후 표시) ── */}
      {searched && !loading && items.length > 0 && dongList.length > 2 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>읍·면·동 필터</div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', minWidth: 'max-content' }}>
              {dongList.map(d => (
                <button
                  key={d}
                  onClick={() => { setSelectedDong(d); setSelectedApt(''); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${selectedDong === d ? '#1d4ed8' : '#e5e7eb'}`,
                    background: selectedDong === d ? '#1d4ed8' : '#fff',
                    color: selectedDong === d ? '#fff' : '#374151',
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: selectedDong === d ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 결과 ── */}
      {searched && !loading && items.length > 0 && (
        <>
          {/* 요약 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 16px', background: '#eff6ff', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>조회결과 </span>
              <strong style={{ color: '#1d4ed8' }}>{filtered.length}건</strong>
              <span style={{ color: '#9ca3af', marginLeft: 4 }}>({dealYmdLabel} · {sido} {sigunguName})</span>
            </div>
            {filtered.length > 0 && (
              <>
                <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최저 </span>
                  <strong style={{ color: '#166534' }}>{fmt만원(Math.min(...filtered.map(i => i.price)))}</strong>
                </div>
                <div style={{ padding: '10px 16px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최고 </span>
                  <strong style={{ color: '#92400e' }}>{fmt만원(Math.max(...filtered.map(i => i.price)))}</strong>
                </div>
                <div style={{ padding: '10px 16px', background: '#f9fafb', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>평균 </span>
                  <strong style={{ color: '#374151' }}>{fmt만원(Math.round(filtered.reduce((s, i) => s + i.price, 0) / filtered.length))}</strong>
                </div>
              </>
            )}
          </div>

          {/* 아파트명 필터 */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="아파트명 검색..."
              value={keyword}
              onChange={e => { setKeyword(e.target.value); setSelectedApt(''); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* ── 단지별 요약 카드 ── */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
            단지별 거래 요약 ({aptStats.length}개 단지)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 24 }}>
            {aptStats.slice(0, 20).map(apt => (
              <div
                key={apt.name}
                onClick={() => setSelectedApt(selectedApt === apt.name ? '' : apt.name)}
                style={{
                  padding: 14,
                  background: selectedApt === apt.name ? '#eff6ff' : '#fff',
                  border: `1px solid ${selectedApt === apt.name ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{apt.name}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>거래 <strong>{apt.count}</strong>건</span>
                  <span style={{ color: '#166534' }}>최저 <strong>{fmt만원(apt.min)}</strong></span>
                  <span style={{ color: '#92400e' }}>최고 <strong>{fmt만원(apt.max)}</strong></span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  평균 {fmt만원(apt.avg)}
                </div>
              </div>
            ))}
          </div>

          {/* ── 선택 단지 거래 내역 ── */}
          {selectedApt && aptTrades.length > 0 && (
            <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0369a1', marginBottom: 16 }}>
                {selectedApt} — {dealYmdLabel} 거래 내역 ({aptTrades.length}건)
              </h3>

              {/* 거래 목록 */}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {aptTrades.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 10,
                      background: i % 2 === 0 ? '#fff' : '#f0f9ff',
                      border: '1px solid #e0f2fe',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#374151' }}>{areaLabel(t.area)} · {t.floor}층</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{t.dealDate}{t.dealType ? ` · ${t.dealType}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>{fmt만원(t.price)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#e0f2fe' }}>
                        {['거래일', '전용면적', '층', '거래금액', '거래유형'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aptTrades.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f8faff' }}>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                          <td style={{ padding: '7px 10px' }}>{t.floor}층</td>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt만원(t.price)}</td>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.dealType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* ── 전체 거래 목록 ── */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
            전체 거래 목록 ({filtered.length}건)
          </h3>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(selectedApt ? filtered.filter(i => i.name === selectedApt) : filtered).slice(0, 100).map((t, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedApt(selectedApt === t.name ? '' : t.name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: selectedApt === t.name ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                    border: `1px solid ${selectedApt === t.name ? '#3b82f6' : '#e5e7eb'}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {t.dong} · {areaLabel(t.area)} · {t.floor}층
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{fmt만원(t.price)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.dealDate}</div>
                  </div>
                </div>
              ))}
              {filtered.length > 100 && (
                <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 }}>
                  상위 100건만 표시 (전체 {filtered.length}건) — 아파트명으로 검색하면 전체 확인 가능
                </div>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['아파트명', '법정동', '전용면적', '층', '거래금액', '거래일'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedApt ? filtered.filter(i => i.name === selectedApt) : filtered).slice(0, 100).map((t, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                      onClick={() => setSelectedApt(selectedApt === t.name ? '' : t.name)}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>{t.name}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{t.dong}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                      <td style={{ padding: '8px 12px' }}>{t.floor}층</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt만원(t.price)}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 }}>
                  상위 100건만 표시 (전체 {filtered.length}건) — 아파트명으로 검색하면 전체 확인 가능
                </div>
              )}
            </div>
          )}

          {/* ── 시세 추이 차트 ── */}
          {selectedApt && (
            <AptPriceTrendChart aptName={selectedApt} lawdCd={lawdCd} />
          )}

          {/* ── 선택 단지 위치 지도 (테이블 클릭 후 하단 표시) ── */}
          {selectedApt && (() => {
            const dong = filtered.find(i => i.name === selectedApt)?.dong ?? '';
            const mapAddress = `${sido} ${sigunguName} ${dong}`.trim();
            const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(selectedApt)}`;
            return (
              <div style={{ marginTop: 16 }}>
                <KakaoMap address={mapAddress} name={selectedApt} />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <a
                    href={kakaoSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}
                  >
                    카카오맵에서 &quot;{selectedApt}&quot; 정확한 위치 보기 →
                  </a>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ── 초기 상태 ── */}
      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 4 }}>지역과 거래월을 선택 후 조회하세요</p>
          <p style={{ fontSize: 13 }}>국토교통부 실거래가 공개시스템 데이터를 실시간으로 조회합니다</p>
        </div>
      )}

      {/* ── 결과 없음 ── */}
      {searched && !loading && items.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>해당 지역·월의 거래 데이터가 없습니다.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>다른 지역이나 월을 선택해보세요.</p>
        </div>
      )}
    </div>
  );
}
