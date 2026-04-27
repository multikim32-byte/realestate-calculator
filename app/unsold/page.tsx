import GlobalNav from '../components/GlobalNav';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import UnsoldList from './UnsoldList';

export const metadata: Metadata = {
  title: '전국 분양정보 2026 — 아파트·오피스텔 미분양·잔여세대·청약중 매물 | mk-land.kr',
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
      </div>
    </div>
  );
}
