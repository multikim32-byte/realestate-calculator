'use client';

import { useEffect, useState, useMemo, startTransition } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface RentItem {
  name: string;
  area: number;
  deposit: number;
  monthlyRent: number;
  dealDate: string;
}

interface MonthStat {
  ym: string;
  label: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface Props {
  aptName: string;
  lawdCd: string;
  mode: '전세' | '월세';
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function recentYms(n = 24): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: MonthStat }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MonthStat;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 13, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.ym}</div>
      <div style={{ color: '#34d399' }}>평균 {fmt(d.avg)}</div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        {fmt(d.min)} ~ {fmt(d.max)} · {d.count}건
      </div>
    </div>
  );
};

export default function RentPriceTrendChart({ aptName, lawdCd, mode }: Props) {
  const [allTrades, setAllTrades] = useState<RentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('전체');

  useEffect(() => {
    if (!aptName || !lawdCd) return;
    startTransition(() => { setLoading(true); setAllTrades([]); setAreaFilter('전체'); });

    const yms = recentYms(24);
    const chunks: string[][] = [];
    for (let i = 0; i < yms.length; i += 8) chunks.push(yms.slice(i, i + 8));

    Promise.all(
      chunks.map(chunk =>
        Promise.all(
          chunk.map(ym =>
            fetch(`/api/rent?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=200`)
              .then(r => r.json())
              .then(d => (d.items ?? []) as RentItem[])
              .catch(() => [] as RentItem[])
          )
        )
      )
    ).then(results => {
      const all = results.flat(2).filter(t =>
        t.name === aptName &&
        (mode === '전세' ? t.monthlyRent === 0 : t.monthlyRent > 0)
      );
      setAllTrades(all);
    }).finally(() => setLoading(false));
  }, [aptName, lawdCd, mode]);

  const areaOptions = useMemo(() => {
    const set = new Set(allTrades.map(t => `${Math.round(t.area / 3.305785)}평`));
    return ['전체', ...Array.from(set).sort((a, b) => parseInt(a) - parseInt(b))];
  }, [allTrades]);

  const chartData = useMemo((): MonthStat[] => {
    const trades = areaFilter === '전체'
      ? allTrades
      : allTrades.filter(t => `${Math.round(t.area / 3.305785)}평` === areaFilter);

    const map: Record<string, { sum: number; min: number; max: number; count: number }> = {};
    trades.forEach(t => {
      const val = mode === '전세' ? t.deposit : t.monthlyRent;
      const ym = t.dealDate.slice(0, 7);
      if (!map[ym]) map[ym] = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
      map[ym].sum += val;
      map[ym].min = Math.min(map[ym].min, val);
      map[ym].max = Math.max(map[ym].max, val);
      map[ym].count++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, s]) => ({
        ym,
        label: ym.slice(2).replace('-', '.'),
        avg: Math.round(s.sum / s.count),
        min: s.min === Infinity ? 0 : s.min,
        max: s.max === -Infinity ? 0 : s.max,
        count: s.count,
      }));
  }, [allTrades, areaFilter, mode]);

  const maxStat = chartData.length ? chartData.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const minStat = chartData.length ? chartData.reduce((a, b) => a.avg < b.avg ? a : b) : null;
  const latest  = chartData[chartData.length - 1];
  const prev    = chartData[chartData.length - 2];
  const change  = latest && prev ? latest.avg - prev.avg : null;
  const peakVsLatest = maxStat && latest && maxStat.avg > 0
    ? Math.round((latest.avg - maxStat.avg) / maxStat.avg * 100)
    : null;

  const color = '#059669';
  const gradId = `rentGrad-${mode}`;

  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>
        {mode === '전세' ? '🔑' : '💰'} {aptName} {mode} 시세 추이
      </div>
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
        최근 2년 데이터 불러오는 중...
      </div>
    </div>
  );

  if (chartData.length === 0) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
        {mode === '전세' ? '🔑' : '💰'} {aptName} {mode} 시세 추이
      </div>
      <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>최근 2년 거래 데이터가 없습니다.</div>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
            {mode === '전세' ? '🔑' : '💰'} {aptName} {mode} 시세 추이
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>최근 2년 월별 평균 {mode === '전세' ? '보증금' : '월세'}</div>
        </div>
        {areaOptions.length > 2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {areaOptions.map(a => (
              <button key={a} onClick={() => setAreaFilter(a)} style={{
                padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: areaFilter === a ? color : '#f1f5f9',
                color: areaFilter === a ? '#fff' : '#475569',
              }}>{a}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {latest && (
          <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>최근 평균</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: color }}>{fmt(latest.avg)}</div>
            {change !== null && (
              <div style={{ fontSize: 12, marginTop: 2, color: change > 0 ? '#dc2626' : change < 0 ? '#2563eb' : '#9ca3af' }}>
                전월 대비 {change > 0 ? '▲' : change < 0 ? '▼' : '-'} {fmt(Math.abs(change))}
              </div>
            )}
            {peakVsLatest !== null && peakVsLatest !== 0 && (
              <div style={{ fontSize: 11, marginTop: 2, color: peakVsLatest >= 0 ? '#dc2626' : '#2563eb' }}>
                전고점 대비 {peakVsLatest > 0 ? '+' : ''}{peakVsLatest}%
              </div>
            )}
          </div>
        )}
        {maxStat && (
          <div style={{ flex: 1, minWidth: 100, background: '#fff7ed', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>2년 최고</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#ea580c' }}>{fmt(maxStat.avg)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{maxStat.ym}</div>
          </div>
        )}
        {minStat && minStat.ym !== maxStat?.ym && (
          <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>2년 최저</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#059669' }}>{fmt(minStat.avg)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{minStat.ym}</div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} tickFormatter={v => fmt(v)}/>
          <Tooltip content={<CustomTooltip />}/>
          <Area type="monotone" dataKey="avg" stroke={color} strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>
        ※ 국토교통부 실거래가 기준 · 최근 2년 월별 평균 {mode === '전세' ? '보증금' : '월세'} · 총 {allTrades.length}건
      </p>
    </div>
  );
}
