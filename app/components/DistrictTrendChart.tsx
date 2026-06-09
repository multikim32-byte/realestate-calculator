'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface TradeItem {
  area: number;
  price: number;
  dealDate: string;
}

interface MonthData {
  ym: string;
  label: string;
  avg: number | null;
  avg60: number | null;  // ~60㎡
  avg85: number | null;  // 60~85㎡
  avg102: number | null; // 85~102㎡
  count: number;
}

interface Props {
  lawdCd: string;
  sigunguName: string;
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v / 1000)}천`;
}

function avgOf(items: TradeItem[]) {
  if (!items.length) return null;
  return Math.round(items.reduce((s, t) => s + t.price, 0) / items.length);
}

function recentYms(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

const TooltipContent = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => p.value > 0 && (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
};

export default function DistrictTrendChart({ lawdCd, sigunguName }: Props) {
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState('');

  useEffect(() => {
    if (!lawdCd || loadedFor === lawdCd) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setMonthData([]);

    const yms = recentYms(12);

    Promise.all(
      yms.map(ym =>
        fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=500`)
          .then(r => r.json())
          .then(d => ({ ym, items: (d.items ?? []) as TradeItem[] }))
          .catch(() => ({ ym, items: [] as TradeItem[] }))
      )
    ).then(results => {
      const data: MonthData[] = results
        .map(({ ym, items }) => {
          const y = ym.slice(0, 4), m = ym.slice(4);
          return {
            ym,
            label: `${y.slice(2)}.${m}`,
            avg:   avgOf(items),
            avg60: avgOf(items.filter(t => t.area < 60)),
            avg85: avgOf(items.filter(t => t.area >= 60 && t.area < 85)),
            avg102: avgOf(items.filter(t => t.area >= 85 && t.area < 102)),
            count: items.length,
          };
        })
        .reverse();
      setMonthData(data);
      setLoadedFor(lawdCd);
    }).finally(() => setLoading(false));
  }, [lawdCd, loadedFor]);

  const latest = monthData[monthData.length - 1];
  const prev   = monthData[monthData.length - 2];
  const change = latest?.avg && prev?.avg ? latest.avg - prev.avg : null;
  const changePct = change && prev?.avg ? ((change / prev.avg) * 100).toFixed(1) : null;
  const totalCount = monthData.reduce((s, d) => s + d.count, 0);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📊 {sigunguName} 시세 추이</div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>12개월 데이터 불러오는 중…</div>
      </div>
    );
  }

  if (!monthData.length) return null;

  const hasArea = monthData.some(d => d.avg60 || d.avg85 || d.avg102);

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
        📊 {sigunguName} 최근 12개월 시세 추이
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>이번달 평균가</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{latest?.avg ? fmt(latest.avg) : '—'}</div>
          {changePct && (
            <div style={{ fontSize: 12, marginTop: 2, color: change! > 0 ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
              {change! > 0 ? '▲' : '▼'} {Math.abs(Number(changePct))}% 전월비
            </div>
          )}
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>이번달 거래량</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{latest?.count ?? 0}건</div>
          {prev?.count && latest?.count && (
            <div style={{ fontSize: 12, marginTop: 2, color: latest.count > prev.count ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
              {latest.count > prev.count ? '▲' : '▼'} {Math.abs(latest.count - prev.count)}건 전월비
            </div>
          )}
        </div>
        <div style={{ background: '#fefce8', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>12개월 총 거래</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ca8a04' }}>{totalCount.toLocaleString()}건</div>
        </div>
        <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>12개월 최고가</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>
            {monthData.filter(d => d.avg).length ? fmt(Math.max(...monthData.filter(d => d.avg).map(d => d.avg!))) : '—'}
          </div>
        </div>
      </div>

      {/* 평균가 추이 차트 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>평균 매매가 추이</div>
        <ResponsiveContainer width="100%" height={200}>
          {hasArea ? (
            <LineChart data={monthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} tickFormatter={fmt} />
              <Tooltip content={<TooltipContent />} />
              <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avg" name="전체" stroke="#1d4ed8" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="avg60" name="~60㎡" stroke="#059669" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
              <Line type="monotone" dataKey="avg85" name="60~85㎡" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
              <Line type="monotone" dataKey="avg102" name="85~102㎡" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
            </LineChart>
          ) : (
            <AreaChart data={monthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} tickFormatter={fmt} />
              <Tooltip content={<TooltipContent />} />
              <Area type="monotone" dataKey="avg" name="평균가" stroke="#1d4ed8" strokeWidth={2} fill="url(#distGrad)" dot={false} connectNulls />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 거래량 추이 */}
      <div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>월별 거래량</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={monthData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => [`${v}건`, '거래량']} labelStyle={{ color: '#fff' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="#dbeafe" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
