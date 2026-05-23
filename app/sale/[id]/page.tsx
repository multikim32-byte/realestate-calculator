import { cache } from 'react';
import type { Metadata } from 'next';
import { fetchPublicSaleList, type PublicSaleItem } from '@/lib/publicDataApi';
import { fetchSaleContent } from '@/lib/saleContent';
import { createAdminClient } from '@/lib/supabaseAdmin';
import SaleDetailClient from './SaleDetailClient';

export const revalidate = 86400;

// cache() deduplicates across generateStaticParams / generateMetadata / page render
const fetchAllSaleItems = cache(async (): Promise<PublicSaleItem[]> => {
  try {
    const { items } = await fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true });
    return items;
  } catch {
    return [];
  }
});

async function fetchSaleContentIds(): Promise<string[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('sale_content')
      .select('house_manage_no')
      .eq('is_published', true);
    return data?.map((d: { house_manage_no: string }) => d.house_manage_no) ?? [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const [items, contentIds] = await Promise.all([
    fetchAllSaleItems(),
    fetchSaleContentIds(),
  ]);
  const apiIds = new Set(items.map(i => i.houseManageNo));
  const extraIds = contentIds.filter(id => !apiIds.has(id));
  return [
    ...items.map(item => ({ id: item.houseManageNo })),
    ...extraIds.map(id => ({ id })),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [content, items] = await Promise.all([
      fetchSaleContent(id).catch(() => null),
      fetchAllSaleItems(),
    ]);
    const item = items.find(i => i.houseManageNo === id);
    const title = item?.name
      ? `${item.name} 청약정보`
      : '청약 상세정보';
    const description = content?.summary
      || (item
        ? `${item.name} ${item.buildingType} 청약정보. 위치: ${item.location}. 청약접수 ${item.receiptStart}~${item.receiptEnd}. 총 ${item.totalUnits.toLocaleString()}세대.`
        : '청약 일정·분양가·경쟁률·인근 실거래가를 한눈에 확인하세요.');
    const ogImageUrl =
      content?.thumbnail_url ||
      content?.image_urls?.[0] ||
      'https://www.aptzipsa.kr/opengraph-image';
    const ogImages = [{ url: ogImageUrl, width: 1200, height: 630 }];

    return {
      title,
      description,
      alternates: { canonical: `https://www.aptzipsa.kr/sale/${id}` },
      openGraph: {
        title,
        description,
        url: `https://www.aptzipsa.kr/sale/${id}`,
        type: 'website',
        locale: 'ko_KR',
        siteName: '아파트집사',
        images: ogImages,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: '청약 상세정보 | 아파트집사' };
  }
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [content, items] = await Promise.all([
    fetchSaleContent(id).catch(() => null),
    fetchAllSaleItems(),
  ]);
  const initialItem = items.find(i => i.houseManageNo === id) ?? null;

  return <SaleDetailClient content={content} initialItem={initialItem} />;
}
