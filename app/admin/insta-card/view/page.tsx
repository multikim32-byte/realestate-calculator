'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import InstaCard, { type SaleItem, type UnsoldItem } from '../InstaCard';

function CardView() {
  const params = useSearchParams();
  const type = (params.get('type') ?? '청약일정') as '청약일정' | '미분양';
  const region = params.get('region') ?? '전국';
  const month = params.get('month') ?? '';

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<UnsoldItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type === '청약일정') {
      fetch('/api/sale?type=all&perPage=100')
        .then(r => r.json())
        .then(data => {
          const filtered = (data.items ?? []).filter((item: SaleItem & { receiptStart: string }) => {
            const inMonth = !month || item.receiptStart?.startsWith(month);
            const inRegion = region === '전국' || item.location?.includes(region);
            return inMonth && inRegion;
          });
          setSaleItems(filtered);
        })
        .finally(() => setLoading(false));
    } else {
      fetch('/api/admin/unsold')
        .then(r => r.json())
        .then(data => {
          const filtered = (data as UnsoldItem[]).filter(item =>
            region === '전국' || item.location?.includes(region)
          );
          setUnsoldItems(filtered);
        })
        .finally(() => setLoading(false));
    }
  }, [type, region, month]);

  if (loading) {
    return (
      <div style={{ width: 1080, height: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: 18, color: '#6b7280' }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <InstaCard
      type={type} region={region} month={month}
      saleItems={saleItems} unsoldItems={unsoldItems}
      scale={1}
    />
  );
}

export default function InstaCardViewPage() {
  return (
    <div style={{ width: 1080, height: 1080, overflow: 'hidden' }}>
      <Suspense>
        <CardView />
      </Suspense>
    </div>
  );
}
