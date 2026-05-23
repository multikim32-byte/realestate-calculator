import GlobalNav from '@/app/components/GlobalNav';
import MapClient from './MapClient';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchPublicSaleList } from '@/lib/publicDataApi';

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
  // fetchPublicSaleList의 각 sub-API는 이미 8초 타임아웃이 적용되어 있음
  // 외부 withTimeout 제거 → 7초 조기 컷으로 인한 건수 변동 문제 해소
  const [{ data: unsoldRaw }, saleResult] = await Promise.allSettled([
    Promise.resolve(
      supabase
        .from('unsold_listings')
        .select('id, slug, name, location, min_price, max_price, category, benefit, house_manage_no, lat, lng')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ),
    fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true }),
  ]).then(([u, s]) => [
    u.status === 'fulfilled' ? u.value : { data: [] },
    s.status === 'fulfilled' ? s.value : { items: [] },
  ]) as [{ data: MapUnsoldItem[] | null }, { items: MapSaleItem[] }];

  // 저장된 좌표가 있는 매물만 표시 (fetchSaleDetail 루프 제거 — Vercel 10초 제한 초과 방지)
  const unsoldListings: MapUnsoldItem[] = (unsoldRaw ?? []).filter(i => i.location);

  const saleListings: MapSaleItem[] = (saleResult.items ?? [])
    .filter((i: MapSaleItem) =>
      i.buildingType === '아파트' &&
      i.status !== '청약마감'  // 청약예정·청약중·당첨발표까지만 표시
    )
    .map((i: MapSaleItem) => ({
      houseManageNo: i.houseManageNo,
      name: i.name,
      location: i.location,
      status: i.status,
      receiptStart: i.receiptStart,
      receiptEnd: i.receiptEnd,
      buildingType: i.buildingType,
      totalUnits: i.totalUnits,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <GlobalNav />
      <MapClient unsoldListings={unsoldListings} saleListings={saleListings} />
    </div>
  );
}
