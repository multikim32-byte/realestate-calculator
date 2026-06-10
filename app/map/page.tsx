import GlobalNav from '@/app/components/GlobalNav';
import MapClient from './MapClient';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // 1시간

export const metadata: Metadata = {
  title: '아파트 부동산 지도 — 전국 단지·미분양·청약 위치 조회 | 단지집사',
  description: '전국 아파트 단지 실거래가 시세, 미분양 매물, 청약 단지를 지도에서 한눈에 확인하세요. 시세 오버레이·지역별 필터 제공. 단지집사.',
  keywords: ['부동산 지도', '아파트 지도', '미분양 지도', '청약 지도', '아파트 단지 위치', '단지집사'],
  alternates: { canonical: 'https://www.danjizipsa.kr/map' },
  openGraph: {
    title: '아파트 부동산 지도 — 전국 단지·미분양·청약 위치 조회 | 단지집사',
    description: '전국 아파트 단지 실거래가 시세, 미분양 매물, 청약 단지를 지도에서 한눈에 확인하세요.',
    url: 'https://www.danjizipsa.kr/map',
  },
};

export type MapUnsoldItem = {
  id: string;
  slug: string | null;
  name: string;
  location: string;
  min_price: number | null;
  max_price: number | null;
  category: string;
  benefit: string | null;
  house_manage_no: string | null;
  lat: number | null;
  lng: number | null;
};

export type MapSaleItem = {
  houseManageNo: string;
  name: string;
  location: string;
  status: string;
  receiptStart: string;
  receiptEnd: string;
  buildingType: string;
  totalUnits: number;
};

export default async function MapPage() {
  const { data: unsoldRaw } = await supabase
    .from('unsold_listings')
    .select('id, slug, name, location, min_price, max_price, category, benefit, house_manage_no, lat, lng')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const unsoldListings: MapUnsoldItem[] = (unsoldRaw ?? []).filter(i => i.location);

  return (
    <div className="map-page" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', touchAction: 'none', overscrollBehavior: 'none' }}>
      <GlobalNav />
      <MapClient unsoldListings={unsoldListings} />
    </div>
  );
}
