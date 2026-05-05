import GlobalNav from '../components/GlobalNav';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';
import UnsoldList from './UnsoldList';

const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

export const metadata: Metadata = {
  title: '전국 분양정보 2026 — 미분양·잔여세대·청약중 매물',
  description: '전국 아파트·오피스텔 분양정보를 한눈에 확인하세요. 청약 중 단지, 미분양 잔여세대, 계약 혜택(중도금 무이자·발코니 확장 등) 정보를 지역별로 무료 제공합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/unsold' },
  openGraph: {
    title: '전국 분양정보 2026 — 미분양·잔여세대·청약중 매물 | mk-land.kr',
    description: '전국 아파트·오피스텔 분양정보 한눈에. 청약중·잔여세대·계약 혜택 무료 확인.',
    url: 'https://www.mk-land.kr/unsold',
  },
};

export const revalidate = 60; // 60초마다 재검증

export default async function UnsoldPage() {
  const { data: raw } = await supabase
    .from('unsold_listings')
    .select('*')
    .eq('is_active', true)
    .order('highlight', { ascending: false })
    .order('announcement_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const listings = raw ?? [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.mk-land.kr' },
          { '@type': 'ListItem', position: 2, name: '전국 분양정보', item: 'https://www.mk-land.kr/unsold' },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: '전국 분양정보 2026',
        description: '전국 아파트·오피스텔 분양정보. 청약중 단지, 미분양 잔여세대, 계약 혜택 정보 제공.',
        url: 'https://www.mk-land.kr/unsold',
        isPartOf: { '@type': 'WebSite', url: 'https://www.mk-land.kr', name: 'mk-land.kr' },
      },
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>전국 분양정보 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          청약중 · 미분양 잔여세대 · 계약 혜택 단지를 지역별로 확인하세요
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' }}>
        <UnsoldList listings={listings ?? []} />

        {/* 전체 매물 링크 — 서버 렌더링으로 크롤러가 모든 개별 페이지를 발견할 수 있도록 */}
        {listings.length > 0 && (
          <div style={{ marginTop: 48, background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', margin: '0 0 16px' }}>전체 분양 매물 목록</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {listings.map(item => (
                <Link
                  key={item.id}
                  href={`/unsold/${item.id}`}
                  style={{ fontSize: 14, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}
                >
                  <span style={{ color: item.listing_type === '청약중' ? '#059669' : '#d97706', fontWeight: 700, fontSize: 12, minWidth: 52 }}>
                    {item.listing_type === '청약중' ? '청약중' : '잔여세대'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>— {item.location}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 지역별 모아보기 링크 — 서버 렌더링으로 region 페이지 크롤 유도 */}
        <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 12, padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', margin: '0 0 14px' }}>지역별 청약·분양 모아보기</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REGIONS.map(r => (
              <Link
                key={r}
                href={`/region/${encodeURIComponent(r)}`}
                style={{ padding: '7px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, textDecoration: 'none', fontSize: 13, color: '#374151', fontWeight: 500 }}
              >
                {r} 분양정보
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
