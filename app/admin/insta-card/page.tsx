'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/app/admin/components/AdminHeader';
import InstaCard, { type SaleItem, type UnsoldItem } from './InstaCard';

const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push({ value: `${y}.${m}`, label: `${y}년 ${m}월` });
  }
  return options;
}

const SCALE = 0.42; // 1080 * 0.42 ≈ 454px

export default function InstaCardPage() {
  const router = useRouter();
  const [cardType, setCardType] = useState<'청약일정' | '미분양'>('청약일정');
  const [region, setRegion] = useState('전국');
  const monthOptions = getMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<UnsoldItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (cardType === '청약일정') {
      fetch('/api/sale?type=all&perPage=100')
        .then(r => r.json())
        .then(data => {
          const filtered = (data.items ?? []).filter((item: SaleItem & { receiptStart: string }) => {
            if (!item.receiptStart) return false;
            const inMonth = item.receiptStart.startsWith(month);
            const inRegion = region === '전국' || item.location?.includes(region);
            return inMonth && inRegion;
          });
          setSaleItems(filtered);
        })
        .catch(() => setSaleItems([]))
        .finally(() => setLoading(false));
    } else {
      fetch('/api/admin/unsold')
        .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
        .then(data => {
          if (!data) return;
          const filtered = (data as UnsoldItem[]).filter(item => {
            return region === '전국' || item.location?.includes(region);
          });
          setUnsoldItems(filtered);
        })
        .catch(() => setUnsoldItems([]))
        .finally(() => setLoading(false));
    }
  }, [cardType, region, month, router]);

  const openFullView = () => {
    const params = new URLSearchParams({ type: cardType, region, month });
    window.open(`/admin/insta-card/view?${params}`, '_blank', 'width=1120,height=1180');
  };

  const itemCount = cardType === '청약일정' ? saleItems.length : unsoldItems.length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminHeader />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>인스타 카드 생성</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>필터를 선택하고 미리보기를 확인한 뒤 새 창에서 캡처하세요</p>

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 필터 패널 */}
          <div style={{ width: 240, background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>카드 유형</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['청약일정', '미분양'] as const).map(t => (
                  <button key={t} onClick={() => setCardType(t)} style={{
                    padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: cardType === t ? '#1d4ed8' : '#f1f5f9',
                    color: cardType === t ? '#fff' : '#374151',
                    fontSize: 14, fontWeight: cardType === t ? 700 : 400,
                  }}>
                    {t === '청약일정' ? '📅 청약 일정' : '🏢 미분양 리스트'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>지역</p>
              <select value={region} onChange={e => setRegion(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {cardType === '청약일정' && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>월</p>
                <select value={month} onChange={e => setMonth(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                  {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 20, fontSize: 13, color: '#6b7280' }}>
              데이터 <strong style={{ color: '#1e293b' }}>{itemCount}건</strong>
              {itemCount > 9 && <span style={{ color: '#f59e0b', display: 'block', marginTop: 4, fontSize: 12 }}>⚠️ 9건까지 표시</span>}
            </div>

            <button onClick={openFullView} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: '#1d4ed8', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}>
              📸 새 창에서 캡처
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
              1080×1080 원본 크기로 열림
            </p>
          </div>

          {/* 미리보기 */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>미리보기 (실제 크기의 42%)</p>
            <div style={{ width: 1080 * SCALE, height: 1080 * SCALE, position: 'relative' }}>
              {loading ? (
                <div style={{
                  width: 1080 * SCALE, height: 1080 * SCALE, background: '#f1f5f9',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#9ca3af',
                }}>
                  불러오는 중...
                </div>
              ) : itemCount === 0 ? (
                <div style={{
                  width: 1080 * SCALE, height: 1080 * SCALE, background: '#f1f5f9',
                  borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <div style={{ fontSize: 14, color: '#9ca3af' }}>해당 조건의 데이터가 없습니다</div>
                </div>
              ) : (
                <InstaCard
                  type={cardType} region={region} month={month}
                  saleItems={saleItems} unsoldItems={unsoldItems}
                  scale={SCALE}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
