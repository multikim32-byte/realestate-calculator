import GlobalNav from '../components/GlobalNav';
import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
import UnsoldList from './UnsoldList';

export const metadata: Metadata = {
  title: '분양정보 — 전국 아파트·오피스텔 분양 및 특별한 혜택 | mk-land.kr',
  description: '전국 아파트·오피스텔·도시형생활주택 분양 및 미분양 특별한 혜택 매물을 한눈에 확인하세요. 계약 혜택, 잔여 세대, 분양가 정보를 무료로 제공합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/unsold' },
  openGraph: {
    title: '미분양 특별한 혜택 매물 | mk-land.kr',
    description: '전국 미분양 아파트·오피스텔 특별한 혜택 단지 모음. 계약 혜택·잔여 세대 확인.',
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
    .order('created_at', { ascending: false });

  // 청약중 → 잔여세대 순 정렬 (그 안에서 highlight, 최신순 유지)
  const listings = (raw ?? []).sort((a, b) => {
    if (a.listing_type === '청약중' && b.listing_type !== '청약중') return -1;
    if (a.listing_type !== '청약중' && b.listing_type === '청약중') return 1;
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>분양정보</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          전국 아파트·오피스텔 분양 및 미분양 특별한 혜택 단지 모음
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 64px' }}>
        <UnsoldList listings={listings ?? []} />
      </div>
    </div>
  );
}
