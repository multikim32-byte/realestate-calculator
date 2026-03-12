import { Suspense } from 'react';
import { mockSaleItems } from '@/lib/mockData';
import SaleListClient from '../components/SaleListClient';

async function getSaleItems() {
  // 서버에서 API 키 확인 후 데이터 fetch
  const apiKey = process.env.PUBLIC_DATA_API_KEY;

  if (!apiKey) {
    return { items: mockSaleItems, total: mockSaleItems.length, source: 'mock' };
  }

  try {
    const { fetchPublicSaleList } = await import('@/lib/publicDataApi');
    const result = await fetchPublicSaleList({ perPage: 10 });
    return { ...result, source: 'api' };
  } catch {
    return { items: mockSaleItems, total: mockSaleItems.length, source: 'mock_fallback' };
  }
}

export default async function SalePage() {
  const { items, total, source } = await getSaleItems();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6" style={{ textAlign: 'center' }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">분양정보</h1>
        <p className="text-gray-500 text-sm">전국 아파트·오피스텔 분양 정보를 검색하세요</p>
      </div>

      <Suspense fallback={null}>
        <SaleListClient
          initialItems={items as any}
          initialTotal={total}
          dataSource={source}
        />
      </Suspense>
    </div>
  );
}
