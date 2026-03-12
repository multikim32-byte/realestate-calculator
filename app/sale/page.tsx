import { Suspense } from 'react';
import SaleListClient from '../components/SaleListClient';
import GlobalNav from '../components/GlobalNav';

export default function SalePage() {
  return (
    <div>
      <GlobalNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6" style={{ textAlign: 'center' }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">분양정보</h1>
        <p className="text-gray-500 text-sm">전국 아파트·오피스텔 분양 정보를 검색하세요</p>
      </div>

      <Suspense fallback={null}>
        <SaleListClient
          initialItems={[]}
          initialTotal={0}
          dataSource="loading"
        />
      </Suspense>
      </div>
    </div>
  );
}
