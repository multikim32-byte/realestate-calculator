import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicSaleList } from '@/lib/publicDataApi';
import { fetchSaleContent } from '@/lib/saleContent';
import SaleDetailClient from './SaleDetailClient';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const { items } = await fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true });
    return items.map(item => ({ id: item.houseManageNo }));
  } catch {
    return [];
  }
}

// 서버에서 fetchSaleDetail 호출 제거 — SaleDetailClient가 클라이언트에서 /api/sale/detail로 처리
// (fetchSaleDetail는 5개 외부 API 병렬 호출로 최대 8초 소요 → Vercel 10초 한도 초과 위험)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const content = await fetchSaleContent(id);
    const title = '청약 상세정보 | 아파트집사';
    const description = content?.summary || '청약 일정·분양가·경쟁률·인근 실거래가를 한눈에 확인하세요.';
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
  const content = await fetchSaleContent(id).catch(() => null);

  if (!content) notFound();

  return <SaleDetailClient content={content} />;
}
