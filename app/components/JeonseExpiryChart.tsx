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
  ym: string;      // "2026-07"
  label: string;   // "26.07"
  count: number;
  jeonse: number;  // 전세만
  wolse: number;   // 월세만
  isPast: boolean;
  isSoon: boolean; // 3개월 내
}

interface Props {
  lawdCd: string;
  sigunguName: string;
}

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
  const [data, setData] = useState<ExpiryBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState('');
  const [totalActive, setTotalActive] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);

  useEffect(() => {
    if (!lawdCd || loadedFor === lawdCd) return;
    setLoading(true);
    setData([]);

    // 최근 24개월 전월세 데이터 조회 (만료 예정이 미래인 것들)
    const yms = recentYms(24);

    Promise.all(
      yms.map(ym =>
        fetch(`/api/rent?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=500`)
          .then(r => r.json())
          .then(d => (d.items ?? []) as RentItem[])
          .catch(() => [] as RentItem[])
      )
    ).then(results => {
      const allRents = results.flat();
      const today = new Date();
      const todayYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // 만료 예정월 집계 (계약일 + 24개월)
      const bucketMap = new Map<string, { jeonse: number; wolse: number }>();

      let activeCount = 0;
      let soonCount = 0;

      for (const item of allRents) {
        if (!item.dealDate) continue;
        const expiryYm = addMonths(item.dealDate, 24); // 2년 후 만료

        // 이미 만료됐어도 갱신 가능 기간(+2년)이면 포함
        const renewalYm = addMonths(item.dealDate, 48);
        if (renewalYm < todayYm) continue; // 갱신도 끝났으면 제외

        // 표시 범위: 오늘부터 12개월 후까지
        const futureLimit = addMonths(todayYm, 12);

        // 아직 1차 만료 전인 것만 카운트 (active)
        if (expiryYm >= todayYm) {
          activeCount++;
          // 3개월 내 만료
          const soonLimit = addMonths(todayYm, 3);
          if (expiryYm <= soonLimit) soonCount++;
        }

        // 차트 범위: 최근 3개월 ~ 앞으로 12개월
        const chartStart = addMonths(todayYm, -3);
        if (expiryYm < chartStart || expiryYm > futureLimit) continue;

        if (!bucketMap.has(expiryYm)) bucketMap.set(expiryYm, { jeonse: 0, wolse: 0 });
        const b = bucketMap.get(expiryYm)!;
        if (item.monthly === 0) b.jeonse++;
        else b.wolse++;
      }

      setTotalActive(activeCount);
      setExpiringSoon(soonCount);

      // 정렬 후 레이블 생성
      const sorted: ExpiryBucket[] = [...bucketMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, { jeonse, wolse }]) => ({
          ym,
          label: ym.slice(2).replace('-', '.'),
          count: jeonse + wolse,
          jeonse,
          wolse,
          isPast: ym < todayYm,
          isSoon: ym >= todayYm && ym <= addMonths(todayYm, 3),
        }));

      setData(sorted);
      setLoadedFor(lawdCd);
    }).finally(() => setLoading(false));
  }, [lawdCd, loadedFor]);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏠 전세·월세 만료 예정 현황</div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>24개월 계약 데이터 분석 중…</div>
      </div>
    );
  }

  if (!data.length && !loading) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
          🏠 {sigunguName} 전세·월세 만료 예측
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>최근 24개월 계약 기준 · 만료 시점 추산 (계약일 +2년)</div>
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
          <div style={{ fontSize: 18, fontWeight: 800, color: expiringSoon > 0 ? '#d97706' : '#6b7280' }}>
            {expiringSoon.toLocaleString()}건
          </div>
          <div style={{ fontSize: 11, color: expiringSoon > 0 ? '#d97706' : '#9ca3af', marginTop: 2, fontWeight: expiringSoon > 0 ? 700 : 400 }}>
            {expiringSoon > 0 ? '⚠️ 공급 증가 예상' : '해당 없음'}
          </div>
        </div>
        <div style={{ background: '#faf5ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>6개월내 만료</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed' }}>
            {data.filter(d => !d.isPast && d.ym <= addMonths(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`, 6)).reduce((s, d) => s + d.count, 0).toLocaleString()}건
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>시장 공급 예측</div>
        </div>
      </div>

      {/* 만료 파동 차트 */}
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
              {data.map((d, i) => (
                <Cell key={i} fill={d.isPast ? '#e2e8f0' : d.isSoon ? '#fbbf24' : '#60a5fa'} />
              ))}
            </Bar>
            <Bar dataKey="wolse" name="월세" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.isPast ? '#f1f5f9' : d.isSoon ? '#fde68a' : '#a5b4fc'} />
              ))}
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
