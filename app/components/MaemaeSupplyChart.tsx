'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthRow { deal_ym: string; trade_cnt: number; }
interface SupplyBucket { ym: string; label: string; count: number; isPast: boolean; isSoon: boolean; }
interface Props {
  lawdCd: string;
  sigunguName: string;
  aptName?: string;
  dong?: string;
}

type RangeKey = '1년' | '2년' | '3년' | '전체';
const RANGES: { key: RangeKey; future: number; past: number }[] = [
  { key: '1년',  future: 12, past: 4   },
  { key: '2년',  future: 24, past: 8   },
  { key: '3년',  future: 36, past: 12  },
  { key: '전체', future: 36, past: 999 },
];

function addMonths(ym6: string, n: number): string {
  const y = parseInt(ym6.slice(0, 4)), m = parseInt(ym6.slice(4, 6));
  const d = new Date(y, m - 1 + n);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function ym6toYmDash(ym6: string) { return `${ym6.slice(0, 4)}-${ym6.slice(4, 6)}`; }
function getTodayYm6() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label} 비과세 가능</div>
      <div style={{ color: '#34d399' }}>{payload[0]?.value ?? 0}건 잠재 매물</div>
      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>2년 보유 도달 기준</div>
    </div>
  );
};

export default function MaemaeSupplyChart({ lawdCd, sigunguName, aptName, dong }: Props) {
  const [rows, setRows]           = useState<MonthRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadedFor, setLoadedFor] = useState('');
  const [range, setRange]         = useState<RangeKey>('2년');

  const cacheKey = `${lawdCd}|${aptName ?? ''}|${dong ?? ''}`;

  useEffect(() => {
    if (!lawdCd || loadedFor === cacheKey) return;
    setLoading(true);
    const params = new URLSearchParams({ lawdCd });
    if (aptName) params.set('aptName', aptName);
    if (dong)    params.set('dong', dong);
    fetch(`/api/district-history?${params}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setLoadedFor(cacheKey); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lawdCd, aptName, dong, cacheKey, loadedFor]);

  const todayYm6        = getTodayYm6();
  const todayDash       = ym6toYmDash(todayYm6);
  const sel             = RANGES.find(r => r.key === range)!;
  const futureLimitDash = ym6toYmDash(addMonths(todayYm6, sel.future));
  const pastLimitDash   = sel.past === 999 ? '2000-01' : ym6toYmDash(addMonths(todayYm6, -(sel.past)));
  const soon3Dash       = ym6toYmDash(addMonths(todayYm6, 3));
  const soon6Dash       = ym6toYmDash(addMonths(todayYm6, 6));

  const bucketMap = new Map<string, number>();
  let cnt3m = 0, cnt6m = 0, cntFuture = 0;

  for (const r of rows) {
    const supplyDash = ym6toYmDash(addMonths(r.deal_ym, 24));
    if (supplyDash >= todayDash && supplyDash <= soon3Dash) cnt3m   += r.trade_cnt;
    if (supplyDash >= todayDash && supplyDash <= soon6Dash) cnt6m   += r.trade_cnt;
    if (supplyDash >= todayDash)                            cntFuture += r.trade_cnt;
    if (supplyDash < pastLimitDash || supplyDash > futureLimitDash) continue;
    bucketMap.set(supplyDash, (bucketMap.get(supplyDash) ?? 0) + r.trade_cnt);
  }

  const data: SupplyBucket[] = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, count]) => ({
      ym, label: ym.slice(2).replace('-', '.'), count,
      isPast: ym < todayDash,
      isSoon: ym >= todayDash && ym <= soon3Dash,
    }));

  const dbMonths = rows.length > 0
    ? `${rows[0].deal_ym.slice(0,4)}.${rows[0].deal_ym.slice(4,6)} ~ 현재`
    : '수집 중';

  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏷️ 매매 잠재 매물 예측</div>
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>이력 데이터 로딩 중…</div>
    </div>
  );
  if (!rows.length && !loading) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
            🏷️ {aptName ?? dong ?? sigunguName} 매매 잠재 매물 예측
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {aptName ? '단지' : dong ? '동' : '시군구'} 기준 · 데이터: {dbMonths} · 2년 보유 도달 시점 = 비과세 매도 가능
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: range === r.key ? 700 : 500,
              background: range === r.key ? '#059669' : '#f1f5f9',
              color: range === r.key ? '#fff' : '#475569',
            }}>{r.key}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: cnt3m > 0 ? '#fefce8' : '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>3개월내 비과세</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cnt3m > 0 ? '#d97706' : '#6b7280' }}>{cnt3m.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: cnt3m > 0 ? '#d97706' : '#9ca3af', marginTop: 2, fontWeight: cnt3m > 0 ? 700 : 400 }}>
            {cnt3m > 0 ? '⚠️ 매물 출현 예상' : '해당 없음'}
          </div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>6개월내 비과세</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{cnt6m.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>잠재 공급</div>
        </div>
        <div style={{ background: '#f8faff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>12개월내 누적</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{cntFuture.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>보유자 매도 가능</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
          월별 2년 보유 도달 건수
          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6 }}>(음영: 과거 / 노란색: 3개월 내)</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.isPast ? '#d1fae5' : d.isSoon ? '#fbbf24' : '#34d399'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
          <span>■ <span style={{ color: '#34d399' }}>비과세 도달</span></span>
          <span>■ <span style={{ color: '#fbbf24' }}>3개월내</span></span>
          <span>■ <span style={{ color: '#d1fae5' }}>과거</span></span>
        </div>
      </div>

      <div style={{ marginTop: 12, padding: '10px 12px', background: '#f8faff', borderRadius: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
        💡 <strong>해석 가이드</strong>: 2년 보유 도달 건수가 많은 달 = 비과세 매도 가능 물량 증가 → 시장 공급 압력 상승 가능. 단, 실제 매도 여부는 시장 상황에 따라 다름.
      </div>
    </div>
  );
}
