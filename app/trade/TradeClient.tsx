'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LAWD_CODE_MAP, recentMonths } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';
import KakaoMap from '@/app/components/KakaoMap';

const AptPriceTrendChart = dynamic(() => import('@/app/components/AptPriceTrendChart'), {
  ssr: false,
  loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>차트 로딩 중...</div>,
});

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

interface TradeClientProps {
  initialItems?: TradeItem[];
  initialDong?: string;
}

export default function TradeClient({ initialItems = [], initialDong = '개포동' }: TradeClientProps) {
  const [sido, setSido] = useState<keyof typeof LAWD_CODE_MAP>('서울');
  const [lawdCd, setLawdCd] = useState('11680'); // 강남구 기본
  const [dealYmd, setDealYmd] = useState(MONTHS[1].value); // 전달 기본
  const [items, setItems] = useState<TradeItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(initialItems.length > 0);
  const [keyword, setKeyword] = useState('');
  const [selectedApt, setSelectedApt] = useState('');
  const [aptCardCount, setAptCardCount] = useState(20);
  const [selectedDong, setSelectedDong] = useState(initialItems.length > 0 ? initialDong : '전체');
  const [isMobile, setIsMobile] = useState(false);
  const pendingDongRef = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // items 로드 완료 후 pending dong 자동 적용
  useEffect(() => {
    if (pendingDongRef.current && items.length > 0) {
      const dong = pendingDongRef.current;
      pendingDongRef.current = null;
      // 해당 dong이 실제로 존재할 때만 적용
      const exists = items.some(i => i.dong === dong);
      if (exists) setSelectedDong(dong);
    }
  }, [items]);

  // URL 파라미터로 지역 pre-select (분양정보/지역페이지에서 연결 시)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const sidoParam = sp.get('sido');
    const sigunguParam = sp.get('sigungu');
    const dongParam = sp.get('dong');
    if (dongParam) pendingDongRef.current = dongParam;
    if (sidoParam && sigunguParam && sidoParam in LAWD_CODE_MAP) {
      const districts = LAWD_CODE_MAP[sidoParam as keyof typeof LAWD_CODE_MAP];
      const found = districts.find(d => d.name === sigunguParam);
      if (found) {
        setSido(sidoParam as keyof typeof LAWD_CODE_MAP);
        setLawdCd(found.code);
        doSearch(found.code, dealYmd);
        return;
      }
    }
    if (initialItems.length === 0) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sigunguList = LAWD_CODE_MAP[sido];

  // 검색 로직 분리 (lawdCd/dealYmd를 직접 받아서 stale closure 방지)
  const doSearch = async (searchLawdCd: string, searchDealYmd: string) => {
    setLoading(true);
    setError('');
    setSearched(true);
    setSelectedApt('');
    setSelectedDong('전체');
    setAptCardCount(20);
    setItems([]);
    try {
      const res = await fetch(`/api/trade?lawdCd=${searchLawdCd}&dealYmd=${searchDealYmd}&numOfRows=200`);
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

  const handleSearch = () => doSearch(lawdCd, dealYmd);

  const handleSidoChange = (s: keyof typeof LAWD_CODE_MAP) => {
    const firstCode = LAWD_CODE_MAP[s][0].code;
    setSido(s);
    setLawdCd(firstCode);
    doSearch(firstCode, dealYmd);
  };

  const handleSigunguChange = (code: string) => {
    setLawdCd(code);
    doSearch(code, dealYmd);
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
              onChange={e => handleSigunguChange(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
            >
              {sigunguList.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>

          {/* 읍·면·동 */}
          {dongList.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>읍·면·동</label>
              <select
                value={selectedDong}
                onChange={e => { setSelectedDong(e.target.value); setSelectedApt(''); }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
              >
                {dongList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: aptStats.length > aptCardCount ? 10 : 24 }}>
            {aptStats.slice(0, aptCardCount).map(apt => (
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
          {aptStats.length > aptCardCount && (
            <button
              onClick={() => setAptCardCount(c => c + 20)}
              style={{
                width: '100%', marginBottom: 24, padding: '11px',
                borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#1d4ed8',
              }}
            >
              단지 더보기 ({aptCardCount}/{aptStats.length})
            </button>
          )}

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
                        {['거래일', '전용면적', '층', '건축년도', '거래금액', '거래유형', '매수자'].map(h => (
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
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.builtYear || '-'}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt만원(t.price)}</td>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.dealType}</td>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.buyerType || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* ── 관련 정보 바로가기 ── */}
          <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f8faff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>🔗 관련 정보 바로가기</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={`/trade?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigunguName)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#166534' }}>
                📊 같은 지역 실거래가
              </a>
              <a href={`/region/${encodeURIComponent(sido)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                📋 지역별 청약·분양 매물 보기
              </a>
              <a href="/calculator?tab=loan"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                🏦 대출 계산기
              </a>
              <a href="/calculator?tab=acquisition"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                📝 취득세 계산기
              </a>
            </div>
          </div>

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
                {sido && (
                  <div style={{ marginTop: 12, background: '#1e3a5f', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>📋 {sido} 청약·분양 매물 모아보기</p>
                    <a href={`/region/${encodeURIComponent(sido)}`} style={{
                      display: 'inline-block', padding: '10px 22px', borderRadius: 10,
                      background: '#fff', color: '#1e3a5f', fontWeight: 700, fontSize: 14, textDecoration: 'none',
                    }}>{sido} 분양 모아보기 →</a>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── 로딩 중 ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 13 }}>데이터를 불러오는 중...</div>
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
