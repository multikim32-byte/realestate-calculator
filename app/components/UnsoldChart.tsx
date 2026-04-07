'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { UnsoldItem } from '../../lib/getUnsoldData';

type Props = {
  items: UnsoldItem[];
  basePeriod: string;
};

export default function UnsoldChart({ items, basePeriod }: Props) {
  const [selectedSido, setSelectedSido] = useState<string | null>(null);

  const sidoList = useMemo(() => {
    const set = new Set(items.map(i => i.sido).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  // 시도별 합산 또는 선택 시도의 시군구별
  const chartData = useMemo(() => {
    if (!selectedSido) {
      const map: Record<string, number> = {};
      items.forEach(i => {
        if (i.sido && !i.sigungu) {
          map[i.sido] = (map[i.sido] || 0) + i.value;
        }
      });
      // sido-only 없으면 sigungu로 집계
      if (Object.keys(map).length === 0) {
        items.forEach(i => {
          if (i.sido) map[i.sido] = (map[i.sido] || 0) + i.value;
        });
      }
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
    }
    return items
      .filter(i => i.sido === selectedSido && i.sigungu)
      .map(i => ({ name: i.sigungu, value: i.value }))
      .sort((a, b) => b.value - a.value);
  }, [items, selectedSido]);

  const fmtPeriod = (p: string) =>
    p.length === 6 ? `${p.slice(0, 4)}년 ${p.slice(4)}월` : p;

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
        데이터를 불러오는 중입니다.<br />
        <span style={{ fontSize: 12 }}>KOSIS API 키를 설정하면 실시간 데이터가 표시됩니다.</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={selectedSido ?? ''}
          onChange={e => setSelectedSido(e.target.value || null)}
          style={{
            padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e0e7ef',
            fontSize: 14, background: '#fff', cursor: 'pointer',
          }}
        >
          <option value="">전국 시도별</option>
          {sidoList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selectedSido && (
          <button
            onClick={() => setSelectedSido(null)}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← 전체 보기
          </button>
        )}
        {basePeriod && (
          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
            기준: {fmtPeriod(basePeriod)}
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(320, chartData.length * 48) }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={48} unit="세대" />
              <Tooltip
                formatter={(v) => [`${Number(v).toLocaleString()}세대`, '미분양']}
                contentStyle={{ fontSize: 13, borderRadius: 8 }}
              />
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#2563eb' : '#93c5fd'} />
              ))}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
