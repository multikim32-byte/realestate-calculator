'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RentItem {
  deposit: number;
  monthly: number;
  dealDate: string;
  area: number;
}

interface ExpiryBucket {
  ym: string;
  label: string;
  count: number;
  jeonse: number;
  wolse: number;
  isPast: boolean;
  isSoon: boolean;
}

interface Props {
  lawdCd: string;
  sigunguName: string;
}

type RangeKey = '1년' | '2년' | '3년';
const RANGES: { key: RangeKey; months: number }[] = [
  { key: '1년', months: 12 },
  { key: '2년', months: 24 },
  { key: '3년', months: 36 },
];

function recentYms(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

export default function JeonseExpiryChart({ lawdCd, sigunguName }: Props) {
  const [allRents, setAllRents] = useState<RentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState('');
  const [range, setRange] = useState<RangeKey>('2년');

  // 데이터 수집 — 36개월 (3년치 예측 커버)
  useEffect(() => {
    if (!lawdCd || loadedFor === lawdCd) return;
    setLoading(true);
    setAllRents([]);

    const yms = recentYms(36);
    Promise.all(
      yms.map(ym =>
        fetch(`/api/rent?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=500`)
          .then(r => r.json())
          .then(d => (d.items ?? []) as RentItem[])
          .catch(() => [] as RentItem[])
      )
    ).then(results => {
      setAllRents(results.flat());
      setLoadedFor(lawdCd);
    }).finally(() => setLoading(false));
  }, [lawdCd, loadedFor]);

  // 선택 범위 기준으로 집계
  const todayYm = getTodayYm();
  const futureMonths = RANGES.find(r => r.key === range)!.months;
  const futureLimit  = addMonths(todayYm, futureMonths);
  const chartStart   = addMonths(todayYm, -Math.round(futureMonths / 3)); // 과거는 미래의 1/3

  let totalActive = 0, expiringSoon = 0;
  const bucketMap = new Map<string, { jeonse: number; wolse: number }>();

  for (const item of allRents) {
    if (!item.dealDate) continue;
    const expiryYm  = addMonths(item.dealDate, 24);
    const renewalYm = addMonths(item.dealDate, 48);
    if (renewalYm < todayYm) continue;

    if (expiryYm >= todayYm) {
      totalActive++;
      if (expiryYm <= addMonths(todayYm, 3)) expiringSoon++;
    }

    if (expiryYm < chartStart || expiryYm > futureLimit) continue;
    if (!bucketMap.has(expiryYm)) bucketMap.set(expiryYm, { jeonse: 0, wolse: 0 });
    const b = bucketMap.get(expiryYm)!;
    if (item.monthly === 0) b.jeonse++;
    else b.wolse++;
  }

  const data: ExpiryBucket[] = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, { jeonse, wolse }]) => ({
      ym, label: ym.slice(2).replace('-', '.'),
      count: jeonse + wolse, jeonse, wolse,
      isPast: ym < todayYm,
      isSoon: ym >= todayYm && ym <= addMonths(todayYm, 3),
    }));

  const expire6m = data.filter(d => !d.isPast && d.ym <= addMonths(todayYm, 6)).reduce((s, d) => s + d.count, 0);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏠 전세·월세 만료 예측</div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>36개월 계약 데이터 분석 중…</div>
      </div>
    );
  }
  if (!allRents.length && !loading) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      {/* 헤더 + 범위 선택 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
            🏠 {sigunguName} 전세·월세 만료 예측
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>최근 36개월 계약 기준 · 만료 시점 추산 (계약일 +2년)</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: range === r.key ? 700 : 500,
              background: range === r.key ? '#1d4ed8' : '#f1f5f9',
              color: range === r.key ? '#fff' : '#475569',
            }}>{r.key}</button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
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

      {/* 차트 */}
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
            <Bar dataKey="jeonse" name="전세" stackId="a" radius={[0, 0, 0, 0]}>
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
