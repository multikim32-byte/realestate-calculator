'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankItem {
  rank: number;
  name: string;
  dong: string;
  location: string;
  areaBucket?: number;
  currentAvg?: number;
  prevAvg?: number;
  changePct?: number;
  count?: number;
  avgPrice?: number;
  price?: number;
  area?: number;
  floor?: number;
  dealDate?: string;
}

interface Stats {
  stat_date: string;
  total_trades_current: number;
  total_trades_prev: number;
  rising: RankItem[];
  falling: RankItem[];
  top_price: RankItem[];
  top_volume: RankItem[];
}

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${Math.round(v / 1000)}천`;
}

function RankCard({ item, type }: { item: RankItem; type: 'rising' | 'falling' | 'price' | 'volume' }) {
  const badgeColor = type === 'rising' ? '#dc2626' : type === 'falling' ? '#2563eb' : type === 'price' ? '#7c3aed' : '#059669';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{
        minWidth: 22, height: 22, borderRadius: '50%',
        background: item.rank <= 3 ? badgeColor : '#f1f5f9',
        color: item.rank <= 3 ? '#fff' : '#6b7280',
        fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{item.rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.location} · {item.dong}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {type === 'rising' && item.changePct !== undefined && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>▲ {item.changePct}%</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(item.currentAvg!)}</div>
          </>
        )}
        {type === 'falling' && item.changePct !== undefined && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>▼ {Math.abs(item.changePct)}%</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(item.currentAvg!)}</div>
          </>
        )}
        {type === 'price' && item.price !== undefined && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{fmt(item.price)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.area}㎡ · {item.floor}층</div>
          </>
        )}
        {type === 'volume' && item.count !== undefined && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{item.count}건</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>평균 {fmt(item.avgPrice!)}</div>
          </>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'rising',  label: '상승 TOP10',  icon: '📈' },
  { key: 'falling', label: '하락 TOP10',  icon: '📉' },
  { key: 'price',   label: '최고가 TOP10', icon: '👑' },
  { key: 'volume',  label: '거래량 TOP10', icon: '🔥' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function NationalRankings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<TabKey>('rising');

  useEffect(() => {
    fetch('/api/trade-stats')
      .then(r => r.json())
      .then(d => { if (d.stat_date) setStats(d); })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const tabColor = tab === 'rising' ? '#dc2626' : tab === 'falling' ? '#2563eb' : tab === 'price' ? '#7c3aed' : '#059669';
  const items: RankItem[] = tab === 'rising' ? stats.rising
    : tab === 'falling' ? stats.falling
    : tab === 'price' ? stats.top_price
    : stats.top_volume;

  const tradeDiff = stats.total_trades_current - stats.total_trades_prev;
  const tradeDiffPct = stats.total_trades_prev > 0
    ? ((tradeDiff / stats.total_trades_prev) * 100).toFixed(1)
    : null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🏆 전국 실거래 랭킹</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            기준: {stats.stat_date} · 이번달 {stats.total_trades_current.toLocaleString()}건
            {tradeDiffPct && (
              <span style={{ marginLeft: 6, color: tradeDiff > 0 ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
                ({tradeDiff > 0 ? '▲' : '▼'}{Math.abs(Number(tradeDiffPct))}% 전월비)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #f1f5f9' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
            color: tab === t.key ? tabColor : '#9ca3af',
            borderBottom: `2px solid ${tab === t.key ? tabColor : 'transparent'}`,
            marginBottom: -2, whiteSpace: 'nowrap',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div>
        {(items ?? []).slice(0, 10).map(item => (
          <RankCard key={item.rank} item={item} type={tab === 'price' ? 'price' : tab === 'volume' ? 'volume' : tab} />
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Link href="/" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          전국 청약 정보 보기 →
        </Link>
      </div>
    </div>
  );
}
