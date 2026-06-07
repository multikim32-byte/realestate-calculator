'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import KakaoMap from '@/app/components/KakaoMap';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

const DistrictTrendChart = dynamic(() => import('@/app/components/DistrictTrendChart'), { ssr: false });
const JeonseExpiryChart  = dynamic(() => import('@/app/components/JeonseExpiryChart'),  { ssr: false });
const MaemaeSupplyChart  = dynamic(() => import('@/app/components/MaemaeSupplyChart'),  { ssr: false });
const NationalRankings   = dynamic(() => import('@/app/components/NationalRankings'),   { ssr: false });
const TradeTrendSection  = dynamic(() => import('@/app/trade/TradeTrendSection'),       { ssr: false });

type ManageCost = {
  per_unit_total: number;
  per_unit_common: number;
  per_unit_usage: number;
  per_unit_longterm: number;
  total_units: number;
  months: number;
  ref_ym: string;
  breakdown: Record<string, number>;
};

type UnitType = {
  house_ty: string;
  supply_area: number | null;
  exclusive_area: number;
  supply_pyeong: number | null;
  exclusive_pyeong: number;
  count: number;
  source?: string;
};

type Complex = {
  kapt_code: string; name: string; slug: string;
  sido: string; sigungu: string; dong: string | null;
  lat: number | null; lng: number | null;
  total_units: number | null; built_year: number | null; floor_count: number | null;
  nearby_transit: NearbyItem[] | null;
  nearby_schools: SchoolItem[] | null;
  nearby_infra: NearbyItem[] | null;
  phone: string | null;
  unit_types: UnitType[] | null;
  manage_cost: ManageCost | null;
};
type NearbyItem = { name: string; distance: number; address?: string; category?: string; label?: string };
type SchoolItem = NearbyItem & { school_type: string };
type Trade = { date: string; area: number; price: number; floor: number; dong?: string; buyerGbn?: string; slerGbn?: string; dealingGbn?: string; agentSgg?: string; rgstDate?: string; cdealType?: string; cdealDay?: string; };
type RentTrade = { date: string; area: number; floor: number; deposit: number; monthly: number; contractType: string; contractEnd: string; useRRRight: string; preDeposit: number; preMonthly: number; };

const AREA_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b', '#06b6d4'];

function fmt억(p: number) {
  const eok = Math.floor(p / 10000);
  const rest = p % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${rest.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  return `${p.toLocaleString()}만`;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

function areaLabel(area: number) {
  const py = Math.round(area / 3.3);
  return `${Math.round(area)}㎡(${py}평)`;
}

function fmtPhone(raw: string) {
  const n = raw.replace(/\D/g, '');
  if (n.startsWith('02')) {
    return n.length === 9
      ? `${n.slice(0,2)}-${n.slice(2,5)}-${n.slice(5)}`
      : `${n.slice(0,2)}-${n.slice(2,6)}-${n.slice(6)}`;
  }
  if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
  if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  return raw;
}

// 전용면적 → 타입키 매핑
// house_ty 있으면 "84A", 없으면 unit_type의 exclusive_area 문자열(안정적 그룹핑)
function resolveTypeKey(area: number, unitTypes: UnitType[] | null): string {
  if (unitTypes && unitTypes.length > 0) {
    let best: UnitType | null = null;
    let bestDiff = Infinity;
    for (const ut of unitTypes) {
      const diff = Math.abs(ut.exclusive_area - area);
      if (diff < bestDiff) { bestDiff = diff; best = ut; }
    }
    if (best && bestDiff < 3) {
      if (best.house_ty) return best.house_ty;
      return String(best.exclusive_area); // 타입코드 없으면 전용면적으로 구분
    }
  }
  return areaLabel(area);
}

// 차트 범례용 레이블
function typeDisplayLabel(key: string, unitTypes: UnitType[] | null): string {
  if (unitTypes) {
    const ut = unitTypes.find(u => u.house_ty === key);
    if (ut) return `${key} (${Math.round(ut.exclusive_area)}㎡·${ut.exclusive_pyeong}평)`;
    const keyArea = parseFloat(key);
    if (!isNaN(keyArea)) {
      const ut2 = unitTypes.find(u => u.exclusive_area === keyArea);
      if (ut2) return `${ut2.exclusive_pyeong}평 (전용 ${keyArea.toFixed(2)}㎡)`;
    }
  }
  return key;
}

// ── 차트 컴포넌트 ─────────────────────────────────────────────────────────────
function PriceChart({ trades, unitTypes }: { trades: Trade[]; unitTypes: UnitType[] | null }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 타입키 목록 (전용면적 오름차순)
  const typeKeys = useMemo(() => {
    const keyAreaMap = new Map<string, number>();
    for (const t of trades) {
      const key = resolveTypeKey(t.area, unitTypes);
      if (!keyAreaMap.has(key)) keyAreaMap.set(key, t.area);
    }
    return Array.from(keyAreaMap.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([k]) => k);
  }, [trades, unitTypes]);

  const displayKeys = selectedKey ? [selectedKey] : typeKeys.slice(0, 5);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { sum: number; cnt: number }[]> = {};
    for (const trade of trades) {
      const key = resolveTypeKey(trade.area, unitTypes);
      const idx = displayKeys.indexOf(key);
      if (idx < 0) continue;
      const ym = trade.date.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = displayKeys.map(() => ({ sum: 0, cnt: 0 }));
      byMonth[ym][idx].sum += trade.price;
      byMonth[ym][idx].cnt++;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, arr]) => ({
        month: ym,
        ...Object.fromEntries(displayKeys.map((k, i) => [
          k,
          arr[i]?.cnt > 0 ? Math.round(arr[i].sum / arr[i].cnt) : null,
        ])),
      }));
  }, [trades, unitTypes, displayKeys]);

  if (trades.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
      실거래 데이터가 없습니다
    </div>
  );

  return (
    <div>
      {/* 타입 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setSelectedKey(null)}
          style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
            background: !selectedKey ? '#2563eb' : '#f3f4f6',
            color: !selectedKey ? '#fff' : '#374151', fontWeight: 600,
          }}
        >전체</button>
        {typeKeys.map(k => (
          <button key={k}
            onClick={() => setSelectedKey(selectedKey === k ? null : k)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              background: selectedKey === k ? '#2563eb' : '#f3f4f6',
              color: selectedKey === k ? '#fff' : '#374151', fontWeight: 600,
            }}
          >{typeDisplayLabel(k, unitTypes)}</button>
        ))}
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(2)} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => `${Math.round(v / 10000)}억`}
            width={45}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => [fmt억(v as number), name as string]}
            labelFormatter={l => l + '월'}
          />
          {displayKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={k => typeDisplayLabel(k, unitTypes)} />}
          {displayKeys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={AREA_COLORS[i % AREA_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function ComplexClient({ complex }: { complex: Complex }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rents,  setRents]  = useState<RentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildYear, setBuildYear] = useState<number | null>(complex.built_year);
  const [dealType, setDealType] = useState<'매매' | '전세' | '월세'>('매매');
  const [selType,  setSelType]  = useState<string>('');
  const [activeTab, setActiveTab] = useState<'info' | 'transit' | 'school' | 'infra'>('info');

  useEffect(() => {
    const q = `name=${encodeURIComponent(complex.name)}&sido=${encodeURIComponent(complex.sido)}&sigungu=${encodeURIComponent(complex.sigungu)}`;
    Promise.all([
      fetch(`/api/complex/trade?${q}&months=24`).then(r => r.json()),
      fetch(`/api/complex/rent?${q}&months=24`).then(r => r.json()),
    ]).then(([td, rd]) => {
      setTrades(td.trades ?? []);
      if (td.buildYear) setBuildYear(td.buildYear);
      setRents(rd.trades ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [complex.name, complex.sido, complex.sigungu]);

  const unitTypes = complex.unit_types ?? [];

  function supplyLabel(exclusiveM2: number): string {
    const match = unitTypes.find(u => Math.abs(u.exclusive_area - exclusiveM2) <= 1.5);
    if (match && match.supply_area != null) return `${match.supply_pyeong}평 (공급 ${Math.round(match.supply_area)}㎡)`;
    const excPy = Math.round(exclusiveM2 / 3.3);
    return `전용 ${excPy}평`;
  }

  function typeOptionLabel(key: string, area: number): string {
    const ut = unitTypes.find(u => u.house_ty === key);
    if (ut && ut.supply_area != null) {
      // 청약홈 데이터: "공급104.9A㎡ (전용79.99㎡)"
      const letter = ut.house_ty?.match(/([A-Z])$/)?.[1] ?? '';
      return `공급${ut.supply_area.toFixed(1)}${letter}㎡ (전용${ut.exclusive_area}㎡)`;
    }
    if (ut) {
      const letter = ut.house_ty?.match(/([A-Z])$/)?.[1] ?? '';
      return `전용${ut.exclusive_area}${letter}㎡`;
    }
    const keyArea = parseFloat(key);
    if (!isNaN(keyArea)) {
      const ut2 = unitTypes.find(u => u.exclusive_area === keyArea);
      if (ut2) {
        const letter = ut2.house_ty?.match(/([A-Z])$/)?.[1] ?? '';
        return `전용${keyArea}${letter}㎡`;
      }
    }
    return supplyLabel(area);
  }

  function fmtPrice(v: number) {
    return v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v / 100) / 10}천만`;
  }

  const rawList = useMemo(() =>
    dealType === '매매' ? trades
      : dealType === '전세' ? rents.filter(t => t.monthly === 0)
      : rents.filter(t => t.monthly > 0),
    [dealType, trades, rents]
  );

  // 타입키별 unique 옵션 (전용면적 오름차순)
  const typeOptions = useMemo(() => {
    const keyAreaMap = new Map<string, number>();
    for (const t of rawList) {
      const key = resolveTypeKey(t.area, complex.unit_types);
      if (!keyAreaMap.has(key)) keyAreaMap.set(key, t.area);
    }
    return Array.from(keyAreaMap.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([key, area]) => ({ key, area }));
  }, [rawList, complex.unit_types]);

  const curType = selType || typeOptions[0]?.key || '';

  const filtered = useMemo(() =>
    rawList.filter(t => resolveTypeKey(t.area, complex.unit_types) === curType),
    [rawList, curType, complex.unit_types]
  );

  const chartData = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const t of filtered) {
      const ym = t.date.slice(0, 7);
      const val = dealType === '매매' ? (t as Trade).price : (t as RentTrade).deposit;
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(val);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, prices]) => ({
        month,
        avg: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length),
      }));
  }, [filtered, dealType]);

  const lastAvg = chartData.at(-1)?.avg ?? 0;

  const tradeAvg = useMemo(() => {
    const f = trades.filter(t => resolveTypeKey(t.area, complex.unit_types) === curType);
    return f.length ? f.reduce((s, t) => s + t.price, 0) / f.length : 0;
  }, [trades, curType, complex.unit_types]);
  const jeonseAvg = useMemo(() => {
    const f = rents.filter(t => t.monthly === 0 && resolveTypeKey(t.area, complex.unit_types) === curType);
    return f.length ? f.reduce((s, t) => s + t.deposit, 0) / f.length : 0;
  }, [rents, curType, complex.unit_types]);
  const jeonseRatio = tradeAvg > 0 && jeonseAvg > 0
    ? Math.round(jeonseAvg / tradeAvg * 100) : null;

  function contractStatus(dateStr: string, isMonthly: boolean, contractType = '', contractEnd = '') {
    const today = Date.now();
    const deal = new Date(dateStr).getTime();
    if (isMonthly) {
      const exp = contractEnd ? new Date(contractEnd).getTime() : deal + 365.25 * 24 * 3600 * 1000;
      const d = Math.round((exp - today) / 86400000);
      if (d < 0)   return { label: '만료됨',          color: '#6b7280', bg: '#f1f5f9' };
      if (d <= 90) return { label: `만료임박 D-${d}`, color: '#d97706', bg: '#fefce8' };
      return             { label: `거주중 D-${d}`,    color: '#059669', bg: '#f0fdf4' };
    }
    const isRenewed = contractType === '갱신' || contractType === '재계약';
    if (contractEnd) {
      const exp = new Date(contractEnd).getTime();
      const d = Math.round((exp - today) / 86400000);
      if (d < 0)   return { label: '만료됨',          color: '#6b7280', bg: '#f1f5f9' };
      if (d <= 90) return { label: `만료임박 D-${d}`, color: '#d97706', bg: '#fefce8' };
      const tag = isRenewed ? (contractType === '재계약' ? '재계약중' : '갱신중') : '거주중';
      return             { label: `${tag} D-${d}`,   color: isRenewed ? '#7c3aed' : '#059669', bg: isRenewed ? '#ede9fe' : '#f0fdf4' };
    }
    const exp2 = deal + 2 * 365.25 * 24 * 3600 * 1000;
    const d2 = Math.round((exp2 - today) / 86400000);
    if (d2 < -365) return { label: '만료됨',                color: '#6b7280', bg: '#f1f5f9' };
    if (d2 < 0)    return { label: `갱신중 +${-d2}일`,      color: '#7c3aed', bg: '#ede9fe' };
    if (d2 <= 90)  return { label: `만료임박 D-${d2}`,      color: '#d97706', bg: '#fefce8' };
    return               { label: `거주중 D-${d2}`,          color: '#059669', bg: '#f0fdf4' };
  }

  const recentRows = filtered.slice(0, 15);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 64px' }}>

      {/* 뒤로가기 */}
      <Link href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        ← 홈으로
      </Link>

      {/* 헤더 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 24px 20px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{complex.name}</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6b7280' }}>
          📍 {complex.sido} {complex.sigungu}{complex.dong ? ' ' + complex.dong : ''}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {complex.total_units && (
            <span style={{ fontSize: 13, background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
              {complex.total_units.toLocaleString()}세대
            </span>
          )}
          {buildYear && (
            <span style={{ fontSize: 13, background: '#f0fdf4', color: '#16a34a', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
              {buildYear}년 준공
            </span>
          )}
          {complex.floor_count && (
            <span style={{ fontSize: 13, background: '#faf5ff', color: '#7c3aed', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
              최고 {complex.floor_count}층
            </span>
          )}
        </div>
      </div>

      {/* 매매/전세/월세 시세 */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {/* 탭 */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
          {(['매매', '전세', '월세'] as const).map(t => (
            <button key={t} onClick={() => { setDealType(t); setSelType(''); }}
              style={{
                flex: 1, padding: '13px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                background: 'none',
                color: dealType === t ? '#7c3aed' : '#9ca3af',
                borderBottom: dealType === t ? '2px solid #7c3aed' : '2px solid transparent',
                marginBottom: -2,
              }}>{t}</button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>조회 중...</div>
          ) : (
            <>
              {/* 타입 셀렉터 + 평균가 + 전세가율 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                {typeOptions.length > 0 ? (
                  <select
                    value={curType}
                    onChange={e => setSelType(e.target.value)}
                    style={{ fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', color: '#1e293b', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {typeOptions.map(({ key, area }) => (
                      <option key={key} value={key}>{typeOptionLabel(key, area)}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>거래 데이터 없음</span>
                )}
                {lastAvg > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{fmtPrice(lastAvg)}</span>
                    {jeonseRatio !== null && (dealType === '매매' || dealType === '전세') && (
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: jeonseRatio >= 70 ? '#fef2f2' : jeonseRatio >= 50 ? '#fefce8' : '#f0fdf4',
                        color: jeonseRatio >= 70 ? '#dc2626' : jeonseRatio >= 50 ? '#ca8a04' : '#16a34a',
                      }}>전세가율 {jeonseRatio}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* 추이 차트 */}
              {chartData.length > 1 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>월별 평균 추이 (최근 24개월)</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(2)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 10000)}억`} width={40} />
                      <Tooltip
                        formatter={(v: unknown) => [fmt억(v as number), dealType === '월세' ? '보증금' : dealType]}
                        labelFormatter={l => l + '월'}
                      />
                      <Line type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 타입별 시세 비교 (매매만) */}
              {dealType === '매매' && trades.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>타입별 시세 비교</div>
                  <PriceChart trades={trades} unitTypes={complex.unit_types} />
                </div>
              )}

              {/* 최근 실거래 테이블 */}
              {recentRows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>최근 실거래</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>계약일</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>층</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>타입</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>
                          {dealType === '월세' ? '보증/월세' : dealType === '전세' ? '전세가' : '매매가'}
                        </th>
                        {(dealType === '전세' || dealType === '월세') && (
                          <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>상태</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((t, i) => {
                        const typeKey = resolveTypeKey(t.area, complex.unit_types);
                        const hasType = unitTypes.some(u => u.house_ty === typeKey);
                        const isCancelled = dealType === '매매' && !!(t as Trade).cdealType;
                        const priceCell = dealType === '매매'
                          ? fmt억((t as Trade).price)
                          : dealType === '전세'
                            ? fmtPrice((t as RentTrade).deposit)
                            : `${fmtPrice((t as RentTrade).deposit)}/${(t as RentTrade).monthly}만`;
                        const status = (dealType === '전세' || dealType === '월세')
                          ? contractStatus(t.date, dealType === '월세', (t as RentTrade).contractType, (t as RentTrade).contractEnd)
                          : null;
                        const tr = t as Trade;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc', opacity: isCancelled ? 0.45 : 1 }}>
                            <td style={{ padding: '7px 8px', color: '#6b7280', verticalAlign: 'top' }}>
                              {t.date.slice(2).replace(/-/g, '.')}
                              {isCancelled && <div style={{ fontSize: 9, color: '#dc2626' }}>해제</div>}
                            </td>
                            <td style={{ padding: '7px 8px', color: '#6b7280', verticalAlign: 'top' }}>
                              {tr.dong ? `${tr.dong} ` : ''}{t.floor}층
                            </td>
                            <td style={{ padding: '7px 8px', fontWeight: 700, color: hasType ? '#7c3aed' : '#6b7280', verticalAlign: 'top' }}>
                              {hasType ? typeKey : supplyLabel(t.area)}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b', verticalAlign: 'top' }}>
                              {priceCell}
                              {dealType === '매매' && (tr.buyerGbn || tr.slerGbn) && (
                                <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 400 }}>
                                  {[tr.buyerGbn && `매수 ${tr.buyerGbn}`, tr.slerGbn && `매도 ${tr.slerGbn}`].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </td>
                            {status && (
                              <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                                  {status.label}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>해당 면적 거래 데이터 없음</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 단지정보 탭 */}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {/* 탭 헤더 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {([
            { key: 'info', label: '단지정보' },
            { key: 'transit', label: '🚇 교통' },
            { key: 'school', label: '🏫 학군' },
            { key: 'infra', label: '🏥 인프라' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.key ? '#fff' : '#f8fafc',
              color: activeTab === tab.key ? '#1d4ed8' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #1d4ed8' : '2px solid transparent',
            }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {/* 단지정보 */}
          {activeTab === 'info' && (
            <>
            <dl style={{ margin: 0 }}>
              {[
                { label: '단지명', value: complex.name },
                { label: '주소', value: [complex.sido, complex.sigungu, complex.dong].filter(Boolean).join(' ') },
                { label: '총 세대수', value: complex.total_units ? `${complex.total_units.toLocaleString()}세대` : '-' },
                { label: '준공연도', value: buildYear ? `${buildYear}년` : '-' },
                { label: '최고층수', value: complex.floor_count ? `${complex.floor_count}층` : '-' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                  <dt style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{label}</dt>
                  <dd style={{ margin: 0, fontSize: 13, color: '#1e293b' }}>{value}</dd>
                </div>
              ))}
              {complex.phone && (
                <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                  <dt style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>관리사무소</dt>
                  <dd style={{ margin: 0, fontSize: 13, color: '#1e293b' }}>
                    <a href={`tel:${complex.phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                      📞 {fmtPhone(complex.phone)}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {/* 관리비 섹션 */}
            {complex.manage_cost?.per_unit_total ? (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>💰 월 평균 관리비 (세대당)</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 100, background: '#eff6ff', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>합계</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#1d4ed8' }}>
                      {complex.manage_cost.per_unit_total.toLocaleString()}원
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>공용관리비</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#16a34a' }}>
                      {complex.manage_cost.per_unit_common.toLocaleString()}원
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 100, background: '#faf5ff', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>개별사용료</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#7c3aed' }}>
                      {complex.manage_cost.per_unit_usage.toLocaleString()}원
                    </div>
                  </div>
                </div>
                {Object.keys(complex.manage_cost.breakdown).length > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                    {Object.entries(complex.manage_cost.breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, amt]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                          <span style={{ color: '#6b7280' }}>{name}</span>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{amt.toLocaleString()}원</span>
                        </div>
                      ))}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                      {complex.manage_cost.ref_ym.slice(0, 4)}년 {parseInt(complex.manage_cost.ref_ym.slice(4))}월 기준 최근 {complex.manage_cost.months}개월 평균
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            </>
          )}

          {/* 교통 */}
          {activeTab === 'transit' && (
            <div>
              {(complex.nearby_transit?.length ?? 0) === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>교통 정보 수집 중...</p>
              ) : (
                (['subway', 'bus'] as const).map(cat => {
                  const items = complex.nearby_transit!.filter(t => (t.category ?? 'subway') === cat);
                  if (items.length === 0) return null;
                  const sectionLabel = cat === 'subway' ? '🚇 지하철역' : '🚌 버스정류장';
                  const distColor = cat === 'subway' ? '#2563eb' : '#0891b2';
                  return (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>{sectionLabel}</div>
                      {items.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{t.name}</span>
                            {t.address && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{t.address}</div>}
                          </div>
                          <span style={{ fontSize: 13, color: distColor, fontWeight: 700 }}>{fmtDist(t.distance)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 학군 */}
          {activeTab === 'school' && (
            <div>
              {(complex.nearby_schools?.length ?? 0) === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>학군 정보 수집 중...</p>
              ) : (
                (['초등', '중학', '고등', '기타'] as const).map(type => {
                  const schools = complex.nearby_schools!.filter(s => s.school_type === type);
                  if (schools.length === 0) return null;
                  return (
                    <div key={type} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>{type}학교</div>
                      {schools.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: 13, color: '#1e293b' }}>{s.name}</span>
                          <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{fmtDist(s.distance)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 인프라 */}
          {activeTab === 'infra' && (
            <div>
              {(complex.nearby_infra?.length ?? 0) === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>인프라 정보 수집 중...</p>
              ) : (
                complex.nearby_infra!.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 10, marginRight: 8 }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: '#1e293b' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>{fmtDist(item.distance)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 지도 */}
      {complex.lat && complex.lng && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>🗺️ 단지 위치</h2>
          <KakaoMap
            address={[complex.sido, complex.sigungu, complex.dong ?? ''].join(' ')}
            name={complex.name}
          />
        </div>
      )}

      {/* 동네 분석 */}
      {(() => {
        const lawdCd = (LAWD_CODE_MAP[complex.sido as keyof typeof LAWD_CODE_MAP] ?? [])
          .find(d => complex.sigungu.includes(d.name) || d.name.includes(complex.sigungu))?.code ?? '';
        if (!lawdCd) return null;
        return (
          <>
            <DistrictTrendChart lawdCd={lawdCd} sigunguName={complex.sigungu} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0 }}>
              <JeonseExpiryChart  lawdCd={lawdCd} sigunguName={complex.sigungu} />
              <MaemaeSupplyChart  lawdCd={lawdCd} sigunguName={complex.sigungu} />
            </div>
            <NationalRankings />
            <TradeTrendSection tradeStats={null} extSido={complex.sido} extSigungu={complex.sigungu} />
          </>
        );
      })()}

      {/* 관련 링크 */}
      <div style={{ background: '#1e3a5f', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>
          📋 {complex.sigungu} 인근 청약·분양 매물 보기
        </p>
        <Link href={`/region/${encodeURIComponent(complex.sido)}`} style={{
          display: 'inline-block', padding: '10px 22px', borderRadius: 10,
          background: '#fff', color: '#1e3a5f', fontWeight: 700, fontSize: 13, textDecoration: 'none',
        }}>지역 분양 보기 →</Link>
      </div>

    </div>
  );
}
