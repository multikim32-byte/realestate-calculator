'use client';

import { useEffect, useState, startTransition } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface MonthData {
  label: string;
  ym: string;
  count: number;
  avg: number;
  isCurrent: boolean;
}

interface Props {
  lawdCd: string;
  currentYmd: string; // YYYYMM
  sigunguName: string;
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function recentYmds(n: number, currentYmd: string): string[] {
  const y = parseInt(currentYmd.slice(0, 4));
  const m = parseInt(currentYmd.slice(4, 6));
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const count = payload.find(p => p.dataKey === 'count')?.value ?? 0;
  const avg   = payload.find(p => p.dataKey === 'avg')?.value ?? 0;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 13, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#93c5fd' }}>거래량 {count}건</div>
      {avg > 0 && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 2 }}>평균 {fmt(avg)}</div>}
    </div>
  );
};

export default function VolumeChart({ lawdCd, currentYmd, sigunguName }: Props) {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState('');

  useEffect(() => {
    const key = `${lawdCd}-${currentYmd}`;
    if (!lawdCd || !currentYmd || loadedKey === key) return;

    startTransition(() => setLoading(true));
    const ymds = recentYmds(12, currentYmd);

    Promise.all(
      ymds.map(ymd =>
        fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${ymd}&numOfRows=200`)
          .then(r => r.json())
          .then(d => ({ ymd, items: d.items ?? [] }))
          .catch(() => ({ ymd, items: [] }))
      )
    ).then(results => {
      const monthData: MonthData[] = results.map(({ ymd, items }) => {
        const prices: number[] = items.map((i: { price: number }) => i.price).filter((p: number) => p > 0);
        const avg = prices.length > 0
          ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
          : 0;
        return {
          ym: ymd,
          label: `${ymd.slice(2, 4)}.${ymd.slice(4, 6)}`,
          count: items.length,
          avg,
          isCurrent: ymd === currentYmd,
        };
      });
      setData(monthData);
      setLoadedKey(key);
    }).finally(() => setLoading(false));
  }, [lawdCd, currentYmd, loadedKey]);

  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 24 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 8 }}>📊 월별 거래량 추이</div>
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>데이터 불러오는 중...</div>
    </div>
  );

  if (data.length === 0 || data.every(d => d.count === 0)) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const avgCount = Math.round(totalCount / data.filter(d => d.count > 0).length);
  const currentData = data.find(d => d.isCurrent);

  const trend = (() => {
    const recent3 = data.slice(-3).filter(d => d.count > 0);
    const older3  = data.slice(-6, -3).filter(d => d.count > 0);
    if (!recent3.length || !older3.length) return null;
    const recentAvg = recent3.reduce((s, d) => s + d.count, 0) / recent3.length;
    const olderAvg  = older3.reduce((s, d) => s + d.count, 0) / older3.length;
    const diff = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
    return diff;
  })();

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>📊 월별 거래량 추이</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{sigunguName} 최근 12개월 매매 거래 현황</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {currentData && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>이달 </span>
              <strong style={{ color: '#1d4ed8' }}>{currentData.count}건</strong>
            </div>
          )}
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <span style={{ color: '#6b7280' }}>월 평균 </span>
            <strong style={{ color: '#374151' }}>{avgCount}건</strong>
          </div>
          {trend !== null && (
            <div style={{
              background: trend > 10 ? '#fef2f2' : trend < -10 ? '#f0fdf4' : '#f9fafb',
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
            }}>
              <span style={{ color: '#6b7280' }}>최근 추이 </span>
              <strong style={{ color: trend > 10 ? '#dc2626' : trend < -10 ? '#059669' : '#6b7280' }}>
                {trend > 0 ? '▲' : trend < 0 ? '▼' : '-'} {Math.abs(trend)}%
              </strong>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28}/>
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} tickFormatter={v => v > 0 ? fmt(v) : ''}/>
          <Tooltip content={<CustomTooltip />}/>
          <Bar
            yAxisId="left"
            dataKey="count"
            name="거래량"
            fill="#bfdbfe"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            label={false}
          />
          <Line
            yAxisId="right"
            dataKey="avg"
            name="평균가"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 최다 거래월 */}
      {maxCount > 0 && (() => {
        const peakMonth = data.find(d => d.count === maxCount);
        return peakMonth ? (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>
            ※ 최다 거래월: {peakMonth.label} ({maxCount}건) · 막대=거래량, 선=평균 매매가
          </p>
        ) : null;
      })()}
    </div>
  );
}
