import { Suspense } from 'react';
import GlobalNav from '../components/GlobalNav';
import RentalListClient from '../components/RentalListClient';
import { fetchLhRentalList } from '@/lib/lhApi';
import { mockRentalItems } from '@/lib/mockRentalData';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'LH 임대공고 — 행복주택·국민임대·장기전세 입주자 모집공고',
  description: '한국토지주택공사(LH) 행복주택, 국민임대, 통합공공임대, 장기전세 등 임대공고를 한눈에 확인하세요. 지역별 모집 일정과 공급세대수를 빠르게 조회.',
  alternates: { canonical: 'https://www.mk-land.kr/rental' },
};

async function getRentalData(region: string) {
  const key = process.env.LH_API_KEY;
  if (!key) {
    const items = region !== '전체' ? mockRentalItems.filter((i) => i.region === region) : mockRentalItems;
    return { items, total: items.length, source: 'mock' };
  }
  try {
    const result = await fetchLhRentalList(key, { page: 1, perPage: 12, region });
    return { ...result, source: 'api' };
  } catch {
    const items = region !== '전체' ? mockRentalItems.filter((i) => i.region === region) : mockRentalItems;
    return { items, total: items.length, source: 'mock_fallback' };
  }
}

export default async function RentalPage({
  searchParams,
}: {
  searchParams: { region?: string };
}) {
  const region = searchParams.region || '전체';
  const { items, total, source } = await getRentalData(region);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>LH 임대공고</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          행복주택 · 국민임대 · 통합공공임대 · 장기전세 · 영구임대 입주자 모집공고
        </p>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* 안내 박스 */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#1e40af', lineHeight: 1.7,
        }}>
          <strong>한국토지주택공사(LH)</strong> 공식 임대주택 모집공고 정보입니다.
          공고문 원문은 각 공고의 <strong>공고문 보기</strong> 버튼에서 확인하세요.
        </div>

        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>불러오는 중…</div>}>
          <RentalListClient
            initialItems={items}
            initialTotal={total}
            dataSource={source}
          />
        </Suspense>
      </div>
    </div>
  );
}
