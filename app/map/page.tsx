import GlobalNav from '@/app/components/GlobalNav';
import MapClient from './MapClient';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // 1시간

export const metadata: Metadata = {
  title: '부동산 지도 — 미분양·청약 한눈에 | 아파트집사',
  description: '전국 미분양 매물과 청약 단지를 지도에서 한 번에 확인하세요. 아파트집사 부동산 지도.',
  alternates: { canonical: 'https://www.aptzipsa.kr/map' },
  openGraph: {
    title: '부동산 지도 | 아파트집사',
    description: '전국 미분양 매물과 청약 단지를 지도에서 한 번에 확인하세요.',
    url: 'https://www.aptzipsa.kr/map',
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <GlobalNav />
      <MapClient unsoldListings={unsoldListings} />
    </div>
  );
}
