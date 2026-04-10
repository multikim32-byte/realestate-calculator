'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';

interface TradeItem {
  name: string;
  area: number;
  price: number;
  floor: number;
  dealDate: string;
  dong: string;
}

interface MonthStat {
  ym: string;       // "2024-03"
  label: string;    // "24.03"
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface Props {
  aptName: string;
  lawdCd: string;
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function recentYms(n = 36): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MonthStat;
  return (
    <div style={{
      background: '#1e293b', borderRadius: 10, padding: '10px 14px',
      fontSize: 13, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.ym}</div>
      <div style={{ color: '#60a5fa' }}>평균 {fmt(d.avg)}</div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        {fmt(d.min)} ~ {fmt(d.max)} · {d.count}건
      </div>
    </div>
  );
};

export default function AptPriceTrendChart({ aptName, lawdCd }: Props) {
  const [stats, setStats]     = useState<MonthStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState<string>('전체');
  const [allTrades, setAllTrades] = useState<TradeItem[]>([]);

  useEffect(() => {
    if (!aptName || !lawdCd) return;
    setLoading(true);
    setStats([]);
    setAllTrades([]);
    setAreaFilter('전체');

    const yms = recentYms(36);
    // 36개월을 6개씩 묶어서 순차 요청 (API 부하 방지)
    const chunks: string[][] = [];
    for (let i = 0; i < yms.length; i += 6) chunks.push(yms.slice(i, i + 6));

    const fetchChunk = (chunk: string[]) =>
      Promise.all(
        chunk.map(ym =>
          fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=200`)
            .then(r => r.json())
            .then(d => (d.items ?? []) as TradeItem[])
            .catch(() => [] as TradeItem[])
        )
      );

    (async () => {
      const allResults: TradeItem[] = [];
      for (const chunk of chunks) {
        const res = await fetchChunk(chunk);
        allResults.push(...res.flat().filter(t => t.name === aptName));
      }
      setAllTrades(allResults);
      setLoading(false);
    })();
  }, [aptName, lawdCd]);

  // 면적 목록 (평 기준)
  const areaOptions = useMemo(() => {
    const set = new Set(allTrades.map(t => `${Math.round(t.area / 3.305785)}평`));
    return ['전체', ...Array.from(set).sort((a, b) => parseInt(a) - parseInt(b))];
  }, [allTrades]);

  // 필터된 거래 → 월별 통계
  const chartData = useMemo(() => {
    const filtered = areaFilter === '전체'
      ? allTrades
      : allTrades.filter(t => `${Math.round(t.area / 3.305785)}평` === areaFilter);

    const map: Record<string, { sum: number; min: number; max: number; count: number }> = {};
    filtered.forEach(t => {
      const ym = t.dealDate.slice(0, 7); // "2024-03"
      if (!map[ym]) map[ym] = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
      map[ym].sum += t.price;
      map[ym].min = Math.min(map[ym].min, t.price);
      map[ym].max = Math.max(map[ym].max, t.price);
      map[ym].count++;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, s]) => ({
        ym,
        label: ym.slice(2).replace('-', '.'), // "24.03"
        avg: Math.round(s.sum / s.count),
        min: s.min,
        max: s.max,
        count: s.count,
      }));
  }, [allTrades, areaFilter]);

  // 최고/최저 표시
  const maxStat = chartData.length ? chartData.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const minStat = chartData.length ? chartData.reduce((a, b) => a.avg < b.avg ? a : b) : null;
  const latest  = chartData[chartData.length - 1];
  const prev    = chartData[chartData.length - 2];
  const change  = latest && prev ? latest.avg - prev.avg : null;

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>
          📈 {aptName} 시세 추이
        </div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
          최근 12개월 데이터 불러오는 중...
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 8 }}>
          📈 {aptName} 시세 추이
        </div>
        <div style={{ color: '#9ca3af', fontSize: 14 }}>최근 12개월 거래 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>
            📈 {aptName} 시세 추이
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>최근 3년 월별 평균 실거래가</div>
        </div>

        {/* 면적 필터 */}
        {areaOptions.length > 2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {areaOptions.map(a => (
              <button key={a} onClick={() => setAreaFilter(a)} style={{
                padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: areaFilter === a ? '#1d4ed8' : '#f1f5f9',
                color: areaFilter === a ? '#fff' : '#475569',
              }}>{a}</button>
            ))}
          </div>
        )}
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {latest && (
          <div style={{ flex: 1, minWidth: 100, background: '#eff6ff', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>최근 평균가</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1d4ed8' }}>{fmt(latest.avg)}</div>
            {change !== null && (
              <div style={{ fontSize: 12, color: change > 0 ? '#dc2626' : change < 0 ? '#2563eb' : '#9ca3af', marginTop: 2 }}>
                전월 대비 {change > 0 ? '▲' : change < 0 ? '▼' : '-'} {fmt(Math.abs(change))}
              </div>
            )}
          </div>
        )}
        {maxStat && (
          <div style={{ flex: 1, minWidth: 100, background: '#fff7ed', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>3년 최고</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#ea580c' }}>{fmt(maxStat.avg)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{maxStat.ym}</div>
          </div>
        )}
        {minStat && minStat.ym !== maxStat?.ym && (
          <div style={{ flex: 1, minWidth: 100, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>3년 최저</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#059669' }}>{fmt(minStat.avg)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{minStat.ym}</div>
          </div>
        )}
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false} tickLine={false} width={52}
            tickFormatter={v => fmt(v)}
          />
          <Tooltip content={<CustomTooltip />}/>
          <Area
            type="monotone" dataKey="avg"
            stroke="#1d4ed8" strokeWidth={2.5}
            fill="url(#priceGrad)"
            dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#1d4ed8' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af' }}>
        ※ 국토교통부 실거래가 기준 · 최근 3년 월별 평균가 · 총 {allTrades.length}건
      </p>
    </div>
  );
}
