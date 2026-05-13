import GlobalNav from '@/app/components/GlobalNav';
import MapClient from './MapClient';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchPublicSaleList, fetchSaleDetail } from '@/lib/publicDataApi';

export const revalidate = 1800; // 30분

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
  const [{ data: unsoldRaw }, saleResult] = await Promise.allSettled([
    supabase
      .from('unsold_listings')
      .select('id, slug, name, location, min_price, max_price, category, benefit, house_manage_no, lat, lng')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true }),
  ]).then(([u, s]) => [
    u.status === 'fulfilled' ? u.value : { data: [] },
    s.status === 'fulfilled' ? s.value : { items: [] },
  ]) as [{ data: MapUnsoldItem[] | null }, { items: any[] }];

  // 좌표 없는 + 주소 모호한 매물만 청약홈 API로 주소 보완
  const unsoldListings: MapUnsoldItem[] = await Promise.all(
    (unsoldRaw ?? []).filter(i => i.location).map(async (item: any) => {
      if (item.lat && item.lng) return item; // 저장된 좌표 있으면 그대로
      const isVague = !/[동읍면리]|번지/.test(item.location.replace(/\(.*?\)/g, ''));
      if (isVague && item.house_manage_no) {
        try {
          const detail = await fetchSaleDetail(item.house_manage_no);
          if (detail?.location) return { ...item, location: detail.location };
        } catch { /* 실패 시 원본 주소 유지 */ }
      }
      return item;
    })
  );

  const saleListings: MapSaleItem[] = (saleResult.items ?? [])
    .filter((i: any) => i.status === '청약중' || i.status?.includes('예정'))
    .map((i: any) => ({
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
