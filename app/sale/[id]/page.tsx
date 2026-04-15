import type { Metadata } from 'next';
import { fetchSaleDetail } from '@/lib/publicDataApi';
import SaleDetailClient from './SaleDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const item = await fetchSaleDetail(id);
    if (!item) return { title: '청약 상세정보 | mk-land.kr' };

    const priceText = item.minPrice
      ? ` · ${Math.floor(item.minPrice / 10000)}억~`
      : '';
    const title = `${item.name} 청약정보${priceText} | mk-land.kr`;
    const description = `${item.location} ${item.buildingType} 청약정보. 총 ${item.totalUnits?.toLocaleString()}세대, 청약접수 ${item.receiptStart ?? '일정 확인'}. 분양가·경쟁률·인근 실거래가 한눈에.`;

    return {
      title,
      description,
      alternates: { canonical: `https://www.mk-land.kr/sale/${id}` },
      openGraph: {
        title,
        description,
        url: `https://www.mk-land.kr/sale/${id}`,
      },
    };
  } catch {
    return { title: '청약 상세정보 | mk-land.kr' };
  }
}

export default function SaleDetailPage() {
  return <SaleDetailClient />;
}
