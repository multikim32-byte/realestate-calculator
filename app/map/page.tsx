import GlobalNav from '@/app/components/GlobalNav';
import MapClient from './MapClient';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchPublicSaleList } from '@/lib/publicDataApi';

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

// 7초 내 resolve되지 않으면 빈 결과 반환
function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 7000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default async function MapPage() {
  const [{ data: unsoldRaw }, saleResult] = await Promise.allSettled([
    Promise.resolve(
      supabase
        .from('unsold_listings')
        .select('id, slug, name, location, min_price, max_price, category, benefit, house_manage_no, lat, lng')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ),
    withTimeout(
      fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true }),
      { items: [], total: 0 },
      7000,
    ),
  ]).then(([u, s]) => [
    u.status === 'fulfilled' ? u.value : { data: [] },
    s.status === 'fulfilled' ? s.value : { items: [] },
  ]) as [{ data: MapUnsoldItem[] | null }, { items: any[] }];

  // 저장된 좌표가 있는 매물만 표시 (fetchSaleDetail 루프 제거 — Vercel 10초 제한 초과 방지)
  const unsoldListings: MapUnsoldItem[] = (unsoldRaw ?? []).filter(i => i.location);

  const saleListings: MapSaleItem[] = (saleResult.items ?? [])
    .filter((i: any) =>
      i.status === '청약중' ||
      i.status === '선착순분양' ||  // 잔여세대·임의공급(무순위) 포함
      i.status?.includes('예정')
    )
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
