'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthRow { deal_ym: string; jeonse_cnt: number; wolse_cnt: number; }
interface ExpiryBucket {
  ym: string; label: string; jeonse: number; wolse: number;
  isPast: boolean; isSoon: boolean;
}
interface Props {
  lawdCd: string;
  sigunguName: string;
  aptName?: string;  // 단지 필터 (외부 제어)
  dong?: string;     // 동 필터 (외부 제어)
}

type RangeKey = '1년' | '2년' | '3년' | '전체';
const RANGES: { key: RangeKey; future: number; past: number }[] = [
  { key: '1년',  future: 12, past: 4  },
  { key: '2년',  future: 24, past: 8  },
  { key: '3년',  future: 36, past: 12 },
  { key: '전체', future: 36, past: 999 }, // DB에 있는 전체 과거
];

function addMonths(ym6: string, n: number): string {
  const y = parseInt(ym6.slice(0, 4)), m = parseInt(ym6.slice(4, 6));
  const d = new Date(y, m - 1 + n);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function ym6toYmDash(ym6: string) {
  return `${ym6.slice(0, 4)}-${ym6.slice(4, 6)}`;
}
function getTodayYm6() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label} 만료 예정</div>
      <div style={{ color: '#60a5fa' }}>전세 {payload.find(p => p.name === '전세')?.value ?? 0}건</div>
      <div style={{ color: '#a78bfa' }}>월세 {payload.find(p => p.name === '월세')?.value ?? 0}건</div>
      <div style={{ color: '#fff', marginTop: 4, fontWeight: 700 }}>합계 {total}건</div>
    </div>
  );
};

export default function JeonseExpiryChart({ lawdCd, sigunguName, aptName, dong }: Props) {
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

  const todayYm6  = getTodayYm6();
  const todayDash = ym6toYmDash(todayYm6);
  const sel       = RANGES.find(r => r.key === range)!;
  const futureLimitDash = ym6toYmDash(addMonths(todayYm6, sel.future));
  const pastLimitDash   = sel.past === 999
    ? '2000-01'
    : ym6toYmDash(addMonths(todayYm6, -(sel.past)));

  // deal_ym + 24개월 = 만료 예정월
  const bucketMap = new Map<string, { jeonse: number; wolse: number }>();
  let totalActive = 0, expiringSoon = 0;

  for (const r of rows) {
    const expiryDash  = ym6toYmDash(addMonths(r.deal_ym, 24));
    const renewalDash = ym6toYmDash(addMonths(r.deal_ym, 48));
    if (renewalDash < todayDash) continue;
    if (expiryDash >= todayDash) {
      totalActive += r.jeonse_cnt + r.wolse_cnt;
      const soon3 = ym6toYmDash(addMonths(todayYm6, 3));
      if (expiryDash <= soon3) expiringSoon += r.jeonse_cnt + r.wolse_cnt;
    }
    if (expiryDash < pastLimitDash || expiryDash > futureLimitDash) continue;
    if (!bucketMap.has(expiryDash)) bucketMap.set(expiryDash, { jeonse: 0, wolse: 0 });
    const b = bucketMap.get(expiryDash)!;
    b.jeonse += r.jeonse_cnt;
    b.wolse  += r.wolse_cnt;
  }

  const data: ExpiryBucket[] = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, { jeonse, wolse }]) => ({
      ym, label: ym.slice(2).replace('-', '.'), jeonse, wolse,
      isPast: ym < todayDash,
      isSoon: ym >= todayDash && ym <= ym6toYmDash(addMonths(todayYm6, 3)),
    }));

  const expire6m = data.filter(d => !d.isPast && d.ym <= ym6toYmDash(addMonths(todayYm6, 6)))
    .reduce((s, d) => s + d.jeonse + d.wolse, 0);
  const dbMonths = rows.length > 0
    ? `${rows[0].deal_ym.slice(0,4)}.${rows[0].deal_ym.slice(4,6)} ~ 현재`
    : '수집 중';

  if (loading) return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏠 전세·월세 만료 예측</div>
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>이력 데이터 로딩 중…</div>
    </div>
  );
  if (!rows.length && !loading) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
            🏠 {aptName ?? dong ?? sigunguName} 전세·월세 만료 예측
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {aptName ? '단지' : dong ? '동' : '시군구'} 기준 · 데이터: {dbMonths} · 만료 추산 (계약일 +2년)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: range === r.key ? 700 : 500,
              background: range === r.key ? '#1d4ed8' : '#f1f5f9',
              color: range === r.key ? '#fff' : '#475569',
            }}>{r.key}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>거주중 추정</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{totalActive.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>현재 계약 유효</div>
        </div>
        <div style={{ background: expiringSoon > 0 ? '#fefce8' : '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>3개월내 만료</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: expiringSoon > 0 ? '#d97706' : '#6b7280' }}>{expiringSoon.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: expiringSoon > 0 ? '#d97706' : '#9ca3af', marginTop: 2, fontWeight: expiringSoon > 0 ? 700 : 400 }}>
            {expiringSoon > 0 ? '⚠️ 공급 증가 예상' : '해당 없음'}
          </div>
        </div>
        <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>6개월내 만료</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>{expire6m.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>시장 공급 예측</div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
          월별 만료 예정 건수 <span style={{ fontSize: 10, fontWeight: 400 }}>(음영: 과거 / 노란색: 3개월 내)</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="jeonse" name="전세" stackId="a">
              {data.map((d, i) => <Cell key={i} fill={d.isPast ? '#e2e8f0' : d.isSoon ? '#fbbf24' : '#60a5fa'} />)}
            </Bar>
            <Bar dataKey="wolse" name="월세" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.isPast ? '#f1f5f9' : d.isSoon ? '#fde68a' : '#a5b4fc'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
          <span>■ <span style={{ color: '#60a5fa' }}>전세</span></span>
          <span>■ <span style={{ color: '#a5b4fc' }}>월세</span></span>
          <span>■ <span style={{ color: '#fbbf24' }}>3개월내 만료</span></span>
          <span>■ <span style={{ color: '#e2e8f0' }}>과거</span></span>
        </div>
      </div>
    </div>
  );
}
