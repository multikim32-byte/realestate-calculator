'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LAWD_CODE_MAP, recentMonths } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';
import type { RentItem } from '@/lib/rentApi';
import KakaoMap from '@/app/components/KakaoMap';

const VolumeChart = dynamic(() => import('@/app/components/VolumeChart'), { ssr: false });
const RentPriceTrendChart = dynamic(() => import('@/app/components/RentPriceTrendChart'), { ssr: false });
const MapRegionPicker = dynamic(() => import('@/app/components/MapRegionPicker'), { ssr: false });

const AptPriceTrendChart = dynamic(() => import('@/app/components/AptPriceTrendChart'), {
  ssr: false,
  loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>차트 로딩 중...</div>,
});

const SIDOS = Object.keys(LAWD_CODE_MAP) as Array<keyof typeof LAWD_CODE_MAP>;
const MONTHS = recentMonths(12);

type TabType = '매매' | '전세' | '월세';

type AreaRange = '전체' | '~40' | '40~60' | '60~85' | '85~102' | '102~';
const AREA_RANGES: { label: string; value: AreaRange; min: number; max: number }[] = [
  { label: '전체', value: '전체', min: 0, max: Infinity },
  { label: '~40㎡', value: '~40', min: 0, max: 40 },
  { label: '40~60㎡', value: '40~60', min: 40, max: 60 },
  { label: '60~85㎡', value: '60~85', min: 60, max: 85 },
  { label: '85~102㎡', value: '85~102', min: 85, max: 102 },
  { label: '102㎡~', value: '102~', min: 102, max: Infinity },
];

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
  const [tab, setTab] = useState<TabType>('매매');
  const [sido, setSido] = useState<keyof typeof LAWD_CODE_MAP>('서울');
  const [lawdCd, setLawdCd] = useState('11680'); // 강남구 기본
  const [dealYmd, setDealYmd] = useState(MONTHS[1].value); // 전달 기본

  // 매매 상태
  const [items, setItems] = useState<TradeItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(initialItems.length > 0);

  // 전월세 상태
  const [rentItems, setRentItems] = useState<RentItem[]>([]);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentError, setRentError] = useState('');
  const [rentSearched, setRentSearched] = useState(false);
  // lawdCd+dealYmd for which rent data is loaded (to avoid redundant fetches)
  const rentLoadedKey = useRef('');

  const [keyword, setKeyword] = useState('');
  const [selectedApt, setSelectedApt] = useState('');
  const [aptCardCount, setAptCardCount] = useState(20);
  const [selectedDong, setSelectedDong] = useState(initialItems.length > 0 ? initialDong : '전체');
  const [areaRange, setAreaRange] = useState<AreaRange>('전체');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pendingDongRef = useRef<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (pendingDongRef.current && items.length > 0) {
      const dong = pendingDongRef.current;
      pendingDongRef.current = null;
      const exists = items.some(i => i.dong === dong);
      if (exists) setSelectedDong(dong);
    }
  }, [items]);

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
        doTradeSearch(found.code, dealYmd, true);
        return;
      }
    }
    if (initialItems.length === 0) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sigunguList = LAWD_CODE_MAP[sido];

  // ── 매매 검색 ──────────────────────────────────────────────────────────────

  const doTradeSearch = async (searchLawdCd: string, searchDealYmd: string, resetDong = false) => {
    setLoading(true);
    setError('');
    setSearched(true);
    setSelectedApt('');
    if (resetDong) setSelectedDong('전체');
    setAptCardCount(20);
    setItems([]);
    // 새 검색 시 전월세 캐시 무효화
    rentLoadedKey.current = '';
    setRentItems([]);
    setRentSearched(false);
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

  // ── 전월세 검색 ────────────────────────────────────────────────────────────

  const doRentSearch = async (searchLawdCd: string, searchDealYmd: string) => {
    const cacheKey = `${searchLawdCd}-${searchDealYmd}`;
    if (rentLoadedKey.current === cacheKey) return; // 이미 로드됨

    setRentLoading(true);
    setRentError('');
    setRentSearched(true);
    setSelectedApt('');
    setRentItems([]);
    try {
      const res = await fetch(`/api/rent?lawdCd=${searchLawdCd}&dealYmd=${searchDealYmd}&numOfRows=200`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRentItems(data.items ?? []);
      rentLoadedKey.current = cacheKey;
    } catch (e) {
      setRentError(e instanceof Error ? e.message : '조회 실패');
      setRentItems([]);
    } finally {
      setRentLoading(false);
    }
  };

  const handleSearch = () => {
    if (tab === '매매') {
      doTradeSearch(lawdCd, dealYmd);
    } else {
      // 탭이 전세/월세면 두 API 모두 조회 (전세가율 계산용)
      doTradeSearch(lawdCd, dealYmd);
      doRentSearch(lawdCd, dealYmd);
    }
  };

  // 탭 전환 시 전월세 데이터가 없으면 자동 로드
  const handleTabChange = (t: TabType) => {
    setTab(t);
    setSelectedApt('');
    setKeyword('');
    if ((t === '전세' || t === '월세') && rentLoadedKey.current !== `${lawdCd}-${dealYmd}`) {
      if (searched || rentSearched) {
        doRentSearch(lawdCd, dealYmd);
      }
    }
  };

  const handleSidoChange = (s: keyof typeof LAWD_CODE_MAP) => {
    const firstCode = LAWD_CODE_MAP[s][0].code;
    setSido(s);
    setLawdCd(firstCode);
    doTradeSearch(firstCode, dealYmd, true);
  };

  const handleSigunguChange = (code: string) => {
    setLawdCd(code);
    doTradeSearch(code, dealYmd, true);
  };

  const handleMapSelect = (region: { sido: string; sigunguName: string; lawdCd: string }) => {
    setSido(region.sido as keyof typeof LAWD_CODE_MAP);
    setLawdCd(region.lawdCd);
    setShowMapPicker(false);
    doTradeSearch(region.lawdCd, dealYmd, true);
  };

  // ── 파생 데이터 ────────────────────────────────────────────────────────────

  const dongList = useMemo(() => {
    const src = tab === '매매' ? items : rentItems;
    const set = new Set(src.map(i => i.dong).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [tab, items, rentItems]);

  // 평형 범위 체크
  const inAreaRange = (area: number) => {
    const r = AREA_RANGES.find(a => a.value === areaRange)!;
    return area >= r.min && area < r.max;
  };

  // 현재 탭의 필터된 전월세 목록
  const filteredRent = useMemo(() => {
    return rentItems.filter(i => {
      if (tab === '전세' && i.monthlyRent > 0) return false;
      if (tab === '월세' && i.monthlyRent === 0) return false;
      if (selectedDong !== '전체' && i.dong !== selectedDong) return false;
      if (keyword && !i.name.includes(keyword)) return false;
      if (areaRange !== '전체' && !inAreaRange(i.area)) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentItems, tab, selectedDong, keyword, areaRange]);

  // 매매 필터
  const filtered = useMemo(() => {
    return items.filter(i => {
      if (selectedDong !== '전체' && i.dong !== selectedDong) return false;
      if (keyword && !i.name.includes(keyword)) return false;
      if (areaRange !== '전체' && !inAreaRange(i.area)) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedDong, keyword, areaRange]);

  // 단지별 통계 (매매)
  const aptStats = useMemo(() => {
    const map: Record<string, { count: number; min: number; max: number; sum: number }> = {};
    filtered.forEach(i => {
      if (!map[i.name]) map[i.name] = { count: 0, min: Infinity, max: -Infinity, sum: 0 };
      const s = map[i.name];
      s.count++;
      s.min = Math.min(s.min, i.price);
      s.max = Math.max(s.max, i.price);
      s.sum += i.price;
    });
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s, avg: Math.round(s.sum / s.count) }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 단지별 통계 (전월세)
  const rentAptStats = useMemo(() => {
    const isJeonse = tab === '전세';
    const map: Record<string, { count: number; min: number; max: number; sum: number }> = {};
    filteredRent.forEach(i => {
      const val = isJeonse ? i.deposit : i.monthlyRent;
      if (!map[i.name]) map[i.name] = { count: 0, min: Infinity, max: -Infinity, sum: 0 };
      const s = map[i.name];
      s.count++;
      s.min = Math.min(s.min, val);
      s.max = Math.max(s.max, val);
      s.sum += val;
    });
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s, avg: Math.round(s.sum / s.count) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRent, tab]);

  // 전세가율 계산 (전세 탭에서 매매 데이터도 있을 때)
  const jeonseRatioMap = useMemo(() => {
    if (tab !== '전세' || items.length === 0 || rentItems.length === 0) return {};
    const tradePriceMap: Record<string, number> = {};
    filtered.forEach(i => {
      if (!tradePriceMap[i.name]) tradePriceMap[i.name] = 0;
      tradePriceMap[i.name] = Math.max(tradePriceMap[i.name], i.price);
    });
    const result: Record<string, number> = {};
    filteredRent.forEach(i => {
      if (i.monthlyRent > 0) return;
      const tradeMax = tradePriceMap[i.name];
      if (!tradeMax) return;
      result[i.name] = Math.round((i.deposit / tradeMax) * 100);
    });
    return result;
  }, [tab, filtered, filteredRent, items, rentItems]);

  // 선택 단지 거래 내역
  const aptTrades = useMemo(() => {
    if (!selectedApt) return [];
    return filtered.filter(i => i.name === selectedApt).sort((a, b) => a.dealDate.localeCompare(b.dealDate));
  }, [filtered, selectedApt]);

  const aptRentTrades = useMemo(() => {
    if (!selectedApt) return [];
    return filteredRent.filter(i => i.name === selectedApt).sort((a, b) => a.dealDate.localeCompare(b.dealDate));
  }, [filteredRent, selectedApt]);

  const dealYmdLabel = MONTHS.find(m => m.value === dealYmd)?.label ?? dealYmd;
  const sigunguName = sigunguList.find(s => s.code === lawdCd)?.name ?? '';

  const isRentTab = tab === '전세' || tab === '월세';
  const activeLoading = isRentTab ? rentLoading : loading;
  const activeSearched = isRentTab ? rentSearched : searched;
  const activeError = isRentTab ? rentError : error;
  const activeCount = isRentTab ? filteredRent.length : filtered.length;

  return (
    <div>
      {/* ── 탭 ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {(['매매', '전세', '월세'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              padding: '11px 28px',
              border: 'none',
              background: 'none',
              fontSize: 15,
              fontWeight: tab === t ? 800 : 500,
              color: tab === t ? '#1d4ed8' : '#6b7280',
              cursor: 'pointer',
              borderBottom: `3px solid ${tab === t ? '#1d4ed8' : 'transparent'}`,
              marginBottom: -2,
              transition: 'color 0.15s',
            }}
          >
            {t === '매매' ? '🏠 매매' : t === '전세' ? '🔑 전세' : '💰 월세'}
          </button>
        ))}
      </div>

      {/* ── 지도 선택 피커 ── */}
      {showMapPicker && (
        <MapRegionPicker
          onSelect={handleMapSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* ── 검색 조건 ── */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

          <button
            onClick={handleSearch}
            disabled={activeLoading}
            style={{
              padding: '9px 24px',
              borderRadius: 8,
              background: activeLoading ? '#9ca3af' : '#1d4ed8',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: activeLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {activeLoading ? '조회 중...' : '조회'}
          </button>
          <button
            onClick={() => setShowMapPicker(v => !v)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: showMapPicker ? '#0f172a' : '#f1f5f9',
              color: showMapPicker ? '#fff' : '#374151',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🗺️ 지도 선택
          </button>
        </div>
      </div>

      {/* ── 평형 필터 ── */}
      {(searched || rentSearched) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {AREA_RANGES.map(r => (
            <button key={r.value} onClick={() => { setAreaRange(r.value); setSelectedApt(''); }} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: areaRange === r.value ? 700 : 500,
              background: areaRange === r.value ? '#1d4ed8' : '#f1f5f9',
              color: areaRange === r.value ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 에러 ── */}
      {activeError && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 16, fontSize: 14 }}>
          오류: {activeError}
        </div>
      )}

      {/* ══ 매매 탭 결과 ══════════════════════════════════════════════════════ */}
      {tab === '매매' && searched && !loading && items.length > 0 && (
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

          {/* 단지별 요약 카드 */}
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
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>평균 {fmt만원(apt.avg)}</div>
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

          {/* 선택 단지 거래 내역 */}
          {selectedApt && aptTrades.length > 0 && (
            <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0369a1', marginBottom: 16 }}>
                {selectedApt} — {dealYmdLabel} 거래 내역 ({aptTrades.length}건)
              </h3>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                <div style={{ overflowX: 'auto' }}>
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

          {/* 관련 정보 바로가기 */}
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

          {/* 전체 거래 목록 */}
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.dong} · {areaLabel(t.area)} · {t.floor}층</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{fmt만원(t.price)}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.dealDate}</div>
                  </div>
                </div>
              ))}
              {filtered.length > 100 && (
                <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 }}>
                  상위 100건만 표시 (전체 {filtered.length}건)
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

          {/* 시세 추이 차트 */}
          {selectedApt && <AptPriceTrendChart aptName={selectedApt} lawdCd={lawdCd} />}

          {/* 월별 거래량 차트 */}
          <VolumeChart lawdCd={lawdCd} currentYmd={dealYmd} sigunguName={sigunguName} />

          {/* 선택 단지 위치 지도 */}
          {selectedApt && (() => {
            const dong = filtered.find(i => i.name === selectedApt)?.dong ?? '';
            const mapAddress = `${sido} ${sigunguName} ${dong}`.trim();
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

      {/* ══ 전세/월세 탭 결과 ═════════════════════════════════════════════════ */}
      {isRentTab && rentSearched && !rentLoading && rentItems.length > 0 && (
        <>
          {/* 요약 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>조회결과 </span>
              <strong style={{ color: '#059669' }}>{activeCount}건</strong>
              <span style={{ color: '#9ca3af', marginLeft: 4 }}>({dealYmdLabel} · {sido} {sigunguName})</span>
            </div>
            {activeCount > 0 && tab === '전세' && (
              <>
                <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최저 보증금 </span>
                  <strong style={{ color: '#166534' }}>{fmt만원(Math.min(...filteredRent.map(i => i.deposit)))}</strong>
                </div>
                <div style={{ padding: '10px 16px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최고 보증금 </span>
                  <strong style={{ color: '#92400e' }}>{fmt만원(Math.max(...filteredRent.map(i => i.deposit)))}</strong>
                </div>
                {Object.keys(jeonseRatioMap).length > 0 && (
                  <div style={{ padding: '10px 16px', background: '#eff6ff', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>평균 전세가율 </span>
                    <strong style={{ color: '#1d4ed8' }}>
                      {Math.round(Object.values(jeonseRatioMap).reduce((s, v) => s + v, 0) / Object.values(jeonseRatioMap).length)}%
                    </strong>
                  </div>
                )}
              </>
            )}
            {activeCount > 0 && tab === '월세' && (
              <>
                <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최저 월세 </span>
                  <strong style={{ color: '#166534' }}>{fmt만원(Math.min(...filteredRent.map(i => i.monthlyRent)))}</strong>
                </div>
                <div style={{ padding: '10px 16px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>최고 월세 </span>
                  <strong style={{ color: '#92400e' }}>{fmt만원(Math.max(...filteredRent.map(i => i.monthlyRent)))}</strong>
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

          {/* 갭투자 랭킹 (전세 탭 + 매매 데이터 있을 때) */}
          {tab === '전세' && Object.keys(jeonseRatioMap).length > 0 && (() => {
            const ranked = Object.entries(jeonseRatioMap)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10);
            return (
              <div style={{ marginBottom: 24, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>갭투자 주의 랭킹</span>
                  <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>전세가율 높은 단지 TOP {ranked.length}</span>
                </div>
                <div style={{ padding: '0 4px 8px' }}>
                  {ranked.map(([name, ratio], idx) => {
                    const bg   = ratio >= 80 ? '#fef2f2' : ratio >= 70 ? '#fffbeb' : '#f0fdf4';
                    const clr  = ratio >= 80 ? '#dc2626' : ratio >= 70 ? '#92400e' : '#166534';
                    const lbl  = ratio >= 80 ? '위험' : ratio >= 70 ? '주의' : '안전';
                    return (
                      <div key={name} onClick={() => setSelectedApt(selectedApt === name ? '' : name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px', cursor: 'pointer',
                          background: selectedApt === name ? '#f0fdf4' : 'transparent',
                          borderBottom: idx < ranked.length - 1 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', width: 20, flexShrink: 0 }}>{idx + 1}</span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: clr }}>{ratio}%</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color: clr }}>{lbl}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: '8px 16px 12px', fontSize: 11, color: '#9ca3af' }}>
                  ※ 전세가율 = 전세 보증금 ÷ 매매 최고가 · 80%↑ 위험 · 70~80% 주의
                </div>
              </div>
            );
          })()}

          {/* 단지별 요약 카드 */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
            단지별 {tab} 요약 ({rentAptStats.length}개 단지)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 24 }}>
            {rentAptStats.slice(0, aptCardCount).map(apt => {
              const ratio = jeonseRatioMap[apt.name];
              return (
                <div
                  key={apt.name}
                  onClick={() => setSelectedApt(selectedApt === apt.name ? '' : apt.name)}
                  style={{
                    padding: 14,
                    background: selectedApt === apt.name ? '#f0fdf4' : '#fff',
                    border: `1px solid ${selectedApt === apt.name ? '#22c55e' : '#e5e7eb'}`,
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
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>평균 {fmt만원(apt.avg)}</span>
                    {ratio !== undefined && (
                      <span style={{
                        background: ratio >= 80 ? '#fef2f2' : ratio >= 70 ? '#fef3c7' : '#f0fdf4',
                        color: ratio >= 80 ? '#dc2626' : ratio >= 70 ? '#92400e' : '#166534',
                        fontWeight: 700, fontSize: 11, padding: '1px 6px', borderRadius: 4,
                      }}>
                        전세가율 {ratio}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {rentAptStats.length > aptCardCount && (
            <button
              onClick={() => setAptCardCount(c => c + 20)}
              style={{
                width: '100%', marginBottom: 24, padding: '11px',
                borderRadius: 10, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#059669',
              }}
            >
              단지 더보기 ({aptCardCount}/{rentAptStats.length})
            </button>
          )}

          {/* 선택 단지 거래 내역 (전세/월세) */}
          {selectedApt && aptRentTrades.length > 0 && (
            <div style={{ marginBottom: 24, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 16 }}>
                {selectedApt} — {dealYmdLabel} {tab} 내역 ({aptRentTrades.length}건)
              </h3>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {aptRentTrades.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 10,
                      background: i % 2 === 0 ? '#fff' : '#f0fdf4',
                      border: '1px solid #bbf7d0',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#374151' }}>{areaLabel(t.area)} · {t.floor}층</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                          {t.dealDate}{t.contractType ? ` · ${t.contractType}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{fmt만원(t.deposit)}</div>
                        {t.monthlyRent > 0 && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>월 {fmt만원(t.monthlyRent)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#dcfce7' }}>
                        {tab === '전세'
                          ? ['거래일', '전용면적', '층', '건축년도', '보증금', '계약구분', '계약기간'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>{h}</th>
                            ))
                          : ['거래일', '전용면적', '층', '건축년도', '보증금', '월세', '계약구분'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>{h}</th>
                            ))
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {aptRentTrades.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f0fdf4' }}>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                          <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                          <td style={{ padding: '7px 10px' }}>{t.floor}층</td>
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.builtYear || '-'}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{fmt만원(t.deposit)}</td>
                          {tab === '월세' ? (
                            <td style={{ padding: '7px 10px', fontWeight: 600, color: '#dc2626', whiteSpace: 'nowrap' }}>
                              {fmt만원(t.monthlyRent)}/월
                            </td>
                          ) : (
                            <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.contractTerm ? `${t.contractTerm}개월` : '-'}</td>
                          )}
                          <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.contractType || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 전체 목록 (전세/월세) */}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
            전체 {tab} 목록 ({activeCount}건)
          </h3>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(selectedApt ? filteredRent.filter(i => i.name === selectedApt) : filteredRent).slice(0, 100).map((t, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedApt(selectedApt === t.name ? '' : t.name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: selectedApt === t.name ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#fafafa',
                    border: `1px solid ${selectedApt === t.name ? '#22c55e' : '#e5e7eb'}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.dong} · {areaLabel(t.area)} · {t.floor}층</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{fmt만원(t.deposit)}</div>
                    {t.monthlyRent > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>월 {fmt만원(t.monthlyRent)}</div>}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.dealDate}</div>
                  </div>
                </div>
              ))}
              {activeCount > 100 && (
                <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 }}>
                  상위 100건만 표시 (전체 {activeCount}건)
                </div>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {(tab === '전세'
                      ? ['아파트명', '법정동', '전용면적', '층', '보증금', '계약구분', '거래일']
                      : ['아파트명', '법정동', '전용면적', '층', '보증금', '월세', '계약구분', '거래일']
                    ).map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedApt ? filteredRent.filter(i => i.name === selectedApt) : filteredRent).slice(0, 100).map((t, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                      onClick={() => setSelectedApt(selectedApt === t.name ? '' : t.name)}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>{t.name}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{t.dong}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                      <td style={{ padding: '8px 12px' }}>{t.floor}층</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{fmt만원(t.deposit)}</td>
                      {tab === '월세' && (
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {fmt만원(t.monthlyRent)}/월
                        </td>
                      )}
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{t.contractType || '-'}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activeCount > 100 && (
                <div style={{ textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 }}>
                  상위 100건만 표시 (전체 {activeCount}건) — 아파트명으로 검색하면 전체 확인 가능
                </div>
              )}
            </div>
          )}

          {/* 전세/월세 시세 추이 차트 */}
          {selectedApt && (
            <RentPriceTrendChart aptName={selectedApt} lawdCd={lawdCd} mode={tab as '전세' | '월세'} />
          )}

          {/* 선택 단지 지도 */}
          {selectedApt && (() => {
            const dong = filteredRent.find(i => i.name === selectedApt)?.dong ?? '';
            const mapAddress = `${sido} ${sigunguName} ${dong}`.trim();
            return (
              <div style={{ marginTop: 16 }}>
                <KakaoMap address={mapAddress} name={selectedApt} />
              </div>
            );
          })()}
        </>
      )}

      {/* ── 로딩 중 ── */}
      {activeLoading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 13 }}>데이터를 불러오는 중...</div>
        </div>
      )}

      {/* ── 결과 없음 ── */}
      {!activeLoading && (
        <>
          {tab === '매매' && searched && items.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p>해당 지역·월의 매매 거래 데이터가 없습니다.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>다른 지역이나 월을 선택해보세요.</p>
            </div>
          )}
          {isRentTab && rentSearched && rentItems.length === 0 && !rentError && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p>해당 지역·월의 {tab} 거래 데이터가 없습니다.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>다른 지역이나 월을 선택해보세요.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
