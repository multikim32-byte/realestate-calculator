'use client';

import { useState, useEffect, useRef } from 'react';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';

type TradeStatItem = {
  rank: number;
  name: string;
  dong: string;
  location: string;
  builtYear?: number;
  areaBucket?: number;
  currentAvg?: number;
  prevAvg?: number;
  changePct?: number;
  count?: number;
  price?: number;
  dealDate?: string;
  area?: number;
  floor?: number;
  avgPrice?: number;
};

export type TradeTrendStats = {
  stat_date: string;
  current_month: string;
  prev_month: string;
  rising: TradeStatItem[];
  falling: TradeStatItem[];
  top_price: TradeStatItem[];
  top_volume: TradeStatItem[];
  total_trades_current: number;
  total_trades_prev: number;
} | null;

type TabKey = 'rising' | 'falling' | 'top_price' | 'top_volume';

const TABS: { key: TabKey; label: string; color: string; activeBg: string }[] = [
  { key: 'rising',     label: '📈 급등 TOP10',  color: '#dc2626', activeBg: '#fef2f2' },
  { key: 'falling',    label: '📉 급락 TOP10',  color: '#2563eb', activeBg: '#eff6ff' },
  { key: 'top_price',  label: '🏆 신고가 TOP10', color: '#d97706', activeBg: '#fffbeb' },
  { key: 'top_volume', label: '🔥 거래량 TOP10', color: '#7c3aed', activeBg: '#faf5ff' },
];

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const SIDOS = Object.keys(LAWD_CODE_MAP) as (keyof typeof LAWD_CODE_MAP)[];

function fmt(n?: number) {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}억`;
  return `${n.toLocaleString()}만`;
}

function fmtMonth(ym?: string) {
  if (!ym || ym.length < 6) return '';
  return `${ym.slice(0, 4)}.${ym.slice(4, 6)}`;
}

export default function TradeTrendSection({ tradeStats }: { tradeStats: TradeTrendStats }) {
  const [tab, setTab] = useState<TabKey>('rising');

  // 지역 선택
  const [sido, setSido] = useState('전국');
  const [sigungu, setSigungu] = useState('');

  // 지역별 데이터
  const [regionalStats, setRegionalStats] = useState<TradeTrendStats>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<string>('');  // 중복 fetch 방지

  const sigunguList = sido !== '전국' ? LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [] : [];

  useEffect(() => {
    if (sido === '전국' || !sigungu) {
      setRegionalStats(null);
      fetchedRef.current = '';
      return;
    }
    const found = sigunguList.find((s: { name: string; code: string }) => s.name === sigungu);
    if (!found) return;

    const cacheKey = `${found.code}`;
    if (fetchedRef.current === cacheKey) return;
    fetchedRef.current = cacheKey;

    setLoading(true);
    setRegionalStats(null);
    fetch(`/api/trade/trend?lawdCd=${found.code}&sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}`)
      .then(r => r.json())
      .then(data => setRegionalStats(data))
      .catch(() => setRegionalStats(null))
      .finally(() => setLoading(false));
  }, [sido, sigungu, sigunguList]);

  const handleSidoChange = (v: string) => {
    setSido(v);
    setSigungu('');
    fetchedRef.current = '';
    setRegionalStats(null);
  };

  const stats = sido === '전국' ? tradeStats : regionalStats;
  const isNational = sido === '전국';
  const currentTab = TABS.find(t => t.key === tab)!;
  const items: TradeStatItem[] = stats?.[tab] ?? [];

  const title = isNational
    ? '이번달 전국 실거래 동향'
    : sigungu
      ? `이번달 ${sido} ${sigungu} 실거래 동향`
      : `이번달 ${sido} 실거래 동향`;

  const subtitle = stats
    ? `${fmtMonth(stats.current_month)} 아파트 · 전달(${fmtMonth(stats.prev_month)}) 대비 분석`
    : isNational
      ? '집계 데이터 없음'
      : sigungu ? '시군구를 선택하면 실시간으로 집계합니다' : '시군구를 선택해 주세요';

  return (
    <div style={{ marginBottom: 32, borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' }}>
      {/* 헤더 */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{subtitle}</p>
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', paddingTop: 2 }}>
              <span>이번달 <strong style={{ color: '#1e293b' }}>{(stats.total_trades_current ?? 0).toLocaleString()}</strong>건</span>
              <span>전달 <strong style={{ color: '#1e293b' }}>{(stats.total_trades_prev ?? 0).toLocaleString()}</strong>건</span>
              <span style={{ color: '#d1d5db' }}>집계 {stats.stat_date}</span>
            </div>
          )}
        </div>

        {/* 지역 선택 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>지역 범위</span>
          <select
            value={sido}
            onChange={e => handleSidoChange(e.target.value)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer',
              fontWeight: sido === '전국' ? 700 : 500,
            }}
          >
            <option value="전국">전국</option>
            {SIDOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {sido !== '전국' && (
            <select
              value={sigungu}
              onChange={e => setSigungu(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer',
              }}
            >
              <option value="">시군구 선택</option>
              {sigunguList.map((s: { name: string; code: string }) => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          )}

          {loading && (
            <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              집계 중...
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: '0 0 auto', padding: '10px 18px', fontSize: 13,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? t.color : '#6b7280',
              background: tab === t.key ? t.activeBg : 'transparent',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 컬럼 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
        <div style={{ width: 28, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>단지 · 위치 · 건축년도</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textAlign: 'right', minWidth: 100 }}>
          {tab === 'rising' || tab === 'falling' ? '변동률 / 가격' : ''}
          {tab === 'top_price' ? '거래가 / 일자' : ''}
          {tab === 'top_volume' ? '거래량 / 평균가' : ''}
        </div>
      </div>

      {/* 목록 */}
      {!stats && !loading && !isNational && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          {sigungu ? '데이터가 없습니다.' : '위에서 시군구를 선택해 주세요.'}
        </div>
      )}

      {!stats && !loading && isNational && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          데이터가 없습니다.
        </div>
      )}

      {loading && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          실거래 데이터를 집계하는 중입니다... (5~15초 소요)
        </div>
      )}

      {stats && items.length === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          해당 지역의 {TABS.find(t => t.key === tab)?.label} 데이터가 없습니다.
        </div>
      )}

      {stats && items.length > 0 && items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 20px',
            borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}
        >
          {/* 순위 */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: item.rank <= 3 ? RANK_COLORS[item.rank - 1] : '#f1f5f9',
            color: item.rank <= 3 ? '#fff' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {item.rank}
          </div>

          {/* 단지명 + 위치 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
              {item.dong ? <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, marginLeft: 5 }}>{item.dong}</span> : null}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {item.location}
              {item.builtYear ? ` · ${item.builtYear}년` : ''}
              {(tab === 'rising' || tab === 'falling') && item.areaBucket ? ` · ${item.areaBucket}㎡` : ''}
              {tab === 'top_price' && item.area ? ` · ${item.area}㎡${item.floor ? ` ${item.floor}층` : ''}` : ''}
            </div>
          </div>

          {/* 수치 */}
          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
            {(tab === 'rising' || tab === 'falling') && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: currentTab.color }}>
                  {(item.changePct ?? 0) > 0 ? '+' : ''}{item.changePct}%
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  {fmt(item.prevAvg)} → {fmt(item.currentAvg)}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.count}건</div>
              </>
            )}
            {tab === 'top_price' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: currentTab.color }}>{fmt(item.price)}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{item.dealDate}</div>
              </>
            )}
            {tab === 'top_volume' && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: currentTab.color }}>{item.count}건</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>평균 {fmt(item.avgPrice)}</div>
              </>
            )}
          </div>
        </div>
      ))}

      <div style={{ padding: '10px 20px', fontSize: 11, color: '#cbd5e1', borderTop: '1px solid #f3f4f6' }}>
        국토교통부 실거래가 공개시스템 기반 · {isNational ? '전국 아파트 집계 · 매일 03:00 KST 업데이트' : '실시간 집계'}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
