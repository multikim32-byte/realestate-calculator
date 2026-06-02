'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import KakaoMap from '@/app/components/KakaoMap';

type Complex = {
  kapt_code: string; name: string; slug: string;
  sido: string; sigungu: string; dong: string | null;
  lat: number | null; lng: number | null;
  total_units: number | null; built_year: number | null; floor_count: number | null;
  nearby_transit: NearbyItem[] | null;
  nearby_schools: SchoolItem[] | null;
  nearby_infra: NearbyItem[] | null;
};
type NearbyItem = { name: string; distance: number; address?: string; category?: string; label?: string };
type SchoolItem = NearbyItem & { school_type: string };
type Trade = { date: string; area: number; price: number; floor: number };

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

// ── 차트 컴포넌트 ─────────────────────────────────────────────────────────────
function PriceChart({ trades }: { trades: Trade[] }) {
  const [selectedArea, setSelectedArea] = useState<number | null>(null);

  // 면적 버킷 (5㎡ 단위)
  const areaBuckets = useMemo(() => {
    const buckets = new Set(trades.map(t => Math.round(t.area / 5) * 5));
    return Array.from(buckets).sort((a, b) => a - b);
  }, [trades]);

  // 선택된 면적 필터
  const filtered = useMemo(() =>
    selectedArea ? trades.filter(t => Math.round(t.area / 5) * 5 === selectedArea) : trades,
    [trades, selectedArea]
  );

  // 월별 평균 (면적별 or 전체)
  const chartData = useMemo(() => {
    const byMonth: Record<string, { sum: number; cnt: number }[]> = {};
    const areaList = selectedArea ? [selectedArea] : areaBuckets.slice(0, 5);

    for (const trade of filtered) {
      const ym = trade.date.slice(0, 7);
      const bucket = Math.round(trade.area / 5) * 5;
      const idx = areaList.indexOf(bucket);
      if (idx < 0) continue;
      if (!byMonth[ym]) byMonth[ym] = areaList.map(() => ({ sum: 0, cnt: 0 }));
      byMonth[ym][idx].sum += trade.price;
      byMonth[ym][idx].cnt++;
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, arr]) => ({
        month: ym,
        ...Object.fromEntries(areaList.map((a, i) => [
          areaLabel(a),
          arr[i]?.cnt > 0 ? Math.round(arr[i].sum / arr[i].cnt) : null,
        ])),
      }));
  }, [filtered, areaBuckets, selectedArea]);

  const displayAreas = selectedArea ? [selectedArea] : areaBuckets.slice(0, 5);

  if (trades.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
      실거래 데이터가 없습니다
    </div>
  );

  return (
    <div>
      {/* 평형 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setSelectedArea(null)}
          style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
            background: !selectedArea ? '#2563eb' : '#f3f4f6',
            color: !selectedArea ? '#fff' : '#374151', fontWeight: 600,
          }}
        >전체</button>
        {areaBuckets.map(a => (
          <button key={a}
            onClick={() => setSelectedArea(selectedArea === a ? null : a)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
              background: selectedArea === a ? '#2563eb' : '#f3f4f6',
              color: selectedArea === a ? '#fff' : '#374151', fontWeight: 600,
            }}
          >{areaLabel(a)}</button>
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
          {displayAreas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {displayAreas.slice(0, 5).map((a, i) => (
            <Line
              key={a}
              type="monotone"
              dataKey={areaLabel(a)}
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
  const [trades, setTrades]       = useState<Trade[]>([]);
  const [tradeLoading, setTradeLoading] = useState(true);
  const [buildYear, setBuildYear] = useState<number | null>(complex.built_year);
  const [activeTab, setActiveTab] = useState<'info' | 'transit' | 'school' | 'infra'>('info');

  useEffect(() => {
    fetch(`/api/complex/trade?name=${encodeURIComponent(complex.name)}&sido=${encodeURIComponent(complex.sido)}&sigungu=${encodeURIComponent(complex.sigungu)}&months=24`)
      .then(r => r.json())
      .then(d => { setTrades(d.trades ?? []); if (d.buildYear) setBuildYear(d.buildYear); })
      .catch(() => {})
      .finally(() => setTradeLoading(false));
  }, [complex.name, complex.sido, complex.sigungu]);

  const recentTrades = trades.slice(0, 10);

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

      {/* 시세 차트 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📈 실거래가 시세 (최근 24개월)</h2>
        {tradeLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>조회 중...</div>
        ) : (
          <PriceChart trades={trades} />
        )}
      </div>

      {/* 최근 실거래 */}
      {recentTrades.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>🏷️ 최근 실거래</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['면적', '거래가', '층', '거래일'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#374151' }}>{areaLabel(t.area)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1d4ed8' }}>{fmt억(t.price)}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{t.floor}층</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            </dl>
          )}

          {/* 교통 */}
          {activeTab === 'transit' && (
            <div>
              {(complex.nearby_transit?.length ?? 0) === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>교통 정보 수집 중...</p>
              ) : (
                complex.nearby_transit!.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{t.name}</span>
                      {t.address && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{t.address}</div>}
                    </div>
                    <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>{fmtDist(t.distance)}</span>
                  </div>
                ))
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
