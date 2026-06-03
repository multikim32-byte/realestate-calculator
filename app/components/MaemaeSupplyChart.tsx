'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TradeItem {
  price: number;
  area: number;
  dealDate: string;
}

interface SupplyBucket {
  ym: string;
  label: string;
  count: number;
  isPast: boolean;
  isSoon: boolean;
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

function todayYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fff' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label} 비과세 가능</div>
      <div style={{ color: '#34d399' }}>{count}건 잠재 매물</div>
      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>2년 보유 도달 기준</div>
    </div>
  );
};

export default function MaemaeSupplyChart({ lawdCd, sigunguName }: Props) {
  const [data, setData] = useState<SupplyBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState('');
  const [totalSoon3m, setTotalSoon3m] = useState(0);
  const [totalSoon6m, setTotalSoon6m] = useState(0);
  const [totalFuture, setTotalFuture] = useState(0);

  useEffect(() => {
    if (!lawdCd || loadedFor === lawdCd) return;
    setLoading(true);
    setData([]);

    const yms = recentYms(24);

    Promise.all(
      yms.map(ym =>
        fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=500`)
          .then(r => r.json())
          .then(d => (d.items ?? []) as TradeItem[])
          .catch(() => [] as TradeItem[])
      )
    ).then(results => {
      const allTrades = results.flat();
      const now = todayYm();
      const soon3m = addMonths(now, 3);
      const soon6m = addMonths(now, 6);
      const futureLimit = addMonths(now, 12);
      const chartStart = addMonths(now, -3);

      const bucketMap = new Map<string, number>();

      let cnt3m = 0, cnt6m = 0, cntFuture = 0;

      for (const t of allTrades) {
        if (!t.dealDate) continue;
        const supplyYm = addMonths(t.dealDate, 24); // 2년 보유 도달 시점

        // 미래 집계용 카운트
        if (supplyYm >= now && supplyYm <= soon3m) cnt3m++;
        if (supplyYm >= now && supplyYm <= soon6m) cnt6m++;
        if (supplyYm >= now) cntFuture++;

        // 차트 범위: -3개월 ~ +12개월
        if (supplyYm < chartStart || supplyYm > futureLimit) continue;
        bucketMap.set(supplyYm, (bucketMap.get(supplyYm) ?? 0) + 1);
      }

      setTotalSoon3m(cnt3m);
      setTotalSoon6m(cnt6m);
      setTotalFuture(cntFuture);

      const sorted: SupplyBucket[] = [...bucketMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, count]) => ({
          ym,
          label: ym.slice(2).replace('-', '.'),
          count,
          isPast: ym < now,
          isSoon: ym >= now && ym <= soon3m,
        }));

      setData(sorted);
      setLoadedFor(lawdCd);
    }).finally(() => setLoading(false));
  }, [lawdCd, loadedFor]);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🏷️ 매매 잠재 매물 예측</div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>24개월 매매 데이터 분석 중…</div>
      </div>
    );
  }

  if (!data.length && !loading) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
          🏷️ {sigunguName} 매매 잠재 매물 예측
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>최근 24개월 매매 기준 · 2년 보유 도달 시점 = 비과세 매도 가능</div>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: totalSoon3m > 0 ? '#fefce8' : '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>3개월내 비과세</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: totalSoon3m > 0 ? '#d97706' : '#6b7280' }}>
            {totalSoon3m.toLocaleString()}건
          </div>
          <div style={{ fontSize: 11, color: totalSoon3m > 0 ? '#d97706' : '#9ca3af', marginTop: 2, fontWeight: totalSoon3m > 0 ? 700 : 400 }}>
            {totalSoon3m > 0 ? '⚠️ 매물 출현 예상' : '해당 없음'}
          </div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>6개월내 비과세</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{totalSoon6m.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>잠재 공급</div>
        </div>
        <div style={{ background: '#f8faff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>12개월내 누적</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{totalFuture.toLocaleString()}건</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>보유자 매도 가능</div>
        </div>
      </div>

      {/* 잠재 매물 출현 차트 */}
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
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isPast ? '#d1fae5' : d.isSoon ? '#fbbf24' : '#34d399'}
                />
              ))}
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
