'use client';

import { useEffect, useState } from 'react';

type Unit = { type: string; area: number; count: number; price: number };

function formatPrice(p: number) {
  if (!p) return '미정';
  const eok = Math.floor(p / 10000);
  const rest = p % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${rest.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${p.toLocaleString()}만원`;
}

export default function UnitTable({ houseManageNo }: { houseManageNo: string }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sale/detail?id=${houseManageNo}`)
      .then(r => r.json())
      .then(data => {
        const u = data.item?.units ?? [];
        setUnits(u.filter((x: Unit) => x.type));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [houseManageNo]);

  if (loading) return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>주택형 정보 불러오는 중...</div>
  );
  if (units.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>주택형별 공급정보</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {units.map((u, i) => (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: '#eff6ff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>주택형</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>{u.type}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                { label: '전용면적(㎡)', value: parseFloat(u.type) ? parseFloat(u.type).toFixed(2) : (u.area ? u.area.toFixed(2) : '-') },
                { label: '공급세대수', value: u.count ? `${u.count.toLocaleString()}세대` : '-' },
                { label: '분양가', value: u.price ? formatPrice(u.price) : '미정' },
              ].map(({ label, value }, j) => (
                <div key={label} style={{
                  padding: '10px 8px', textAlign: 'center',
                  borderRight: j < 2 ? '1px solid #e5e7eb' : 'none',
                }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
