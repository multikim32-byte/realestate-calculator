import { cache } from 'react';
import type { Metadata } from 'next';
import { fetchPublicSaleList, type PublicSaleItem } from '@/lib/publicDataApi';
import { fetchSaleContent } from '@/lib/saleContent';
import SaleDetailClient from './SaleDetailClient';

export const revalidate = 3600;

// cache() deduplicates across generateStaticParams / generateMetadata / page render
const fetchAllSaleItems = cache(async (): Promise<PublicSaleItem[]> => {
  try {
    const { items } = await fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true });
    return items;
  } catch {
    return [];
  }
});

export async function generateStaticParams() {
  const items = await fetchAllSaleItems();
  return items.map(item => ({ id: item.houseManageNo }));
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
      ? `${item.name} 청약정보 | 아파트집사`
      : '청약 상세정보 | 아파트집사';
    const description = content?.summary
      || (item
        ? `${item.name} ${item.buildingType} 청약정보. 위치: ${item.location}. 청약접수 ${item.receiptStart}~${item.receiptEnd}. 총 ${item.totalUnits.toLocaleString()}세대.`
        : '청약 일정·분양가·경쟁률·인근 실거래가를 한눈에 확인하세요.');
    const ogImages = content?.thumbnail_url
      ? [{ url: content.thumbnail_url, width: 1200, height: 630 }]
      : undefined;

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
        ...(ogImages && { images: ogImages }),
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
