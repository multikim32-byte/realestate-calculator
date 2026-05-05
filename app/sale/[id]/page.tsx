import type { Metadata } from 'next';
import { cache } from 'react';
import { fetchSaleDetail, fetchPublicSaleList } from '@/lib/publicDataApi';
import { fetchSaleContent } from '@/lib/saleContent';
import SaleDetailClient from './SaleDetailClient';

export const revalidate = 3600;

const getDetail = cache(fetchSaleDetail);
const getContent = cache(fetchSaleContent);

export async function generateStaticParams() {
  try {
    const { items } = await fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true });
    return items.map(item => ({ id: item.houseManageNo }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [item, content] = await Promise.all([getDetail(id), getContent(id)]);
    if (!item) return { title: '청약 상세정보 | 부동산 계산기' };

    const priceRange = item.minPrice && item.maxPrice && item.maxPrice > item.minPrice
      ? ` · 분양가 ${Math.floor(item.minPrice / 10000)}억~${Math.floor(item.maxPrice / 10000)}억`
      : item.minPrice
      ? ` · 분양가 ${Math.floor(item.minPrice / 10000)}억~`
      : '';

    const title = `${item.name} 청약정보${priceRange} — ${item.region} ${item.buildingType}`;
    const defaultDesc = [
      `${item.location} ${item.buildingType} 청약.`,
      item.totalUnits ? `총 ${item.totalUnits.toLocaleString()}세대.` : '',
      item.receiptStart ? `청약접수 ${item.receiptStart}~${item.receiptEnd}.` : '',
      item.winnerDate ? `당첨자 발표 ${item.winnerDate}.` : '',
      `분양가·일정·경쟁률·인근 실거래가를 한눈에 확인하세요.`,
      item.subscriptionArea ? `청약 가능 지역: ${item.subscriptionArea}.` : '',
    ].filter(Boolean).join(' ');

    const description = content?.summary || defaultDesc;

    const keywords = [
      item.name, `${item.name} 청약`, `${item.name} 분양가`,
      item.region, item.district, item.buildingType,
      '청약정보', '분양', '청약일정', '청약접수', '분양가',
      item.constructionCompany,
    ].filter(Boolean).join(', ');

    const ogImages = content?.thumbnail_url
      ? [{ url: content.thumbnail_url, width: 1200, height: 630, alt: item.name }]
      : undefined;

    return {
      title,
      description,
      keywords,
      alternates: { canonical: `https://www.mk-land.kr/sale/${id}` },
      openGraph: {
        title,
        description,
        url: `https://www.mk-land.kr/sale/${id}`,
        type: 'website',
        locale: 'ko_KR',
        siteName: '부동산 계산기 | mk-land',
        ...(ogImages && { images: ogImages }),
      },
    };
  } catch {
    return { title: '청약 상세정보 | 부동산 계산기' };
  }
}

async function buildJsonLd(id: string) {
  try {
    const [item, content] = await Promise.all([getDetail(id), getContent(id)]);
    if (!item) return null;

    const priceText = item.minPrice
      ? `분양가 ${Math.floor(item.minPrice / 10000)}억~${item.maxPrice && item.maxPrice > item.minPrice ? Math.floor(item.maxPrice / 10000) + '억' : ''}`
      : '분양가 미정';

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: `${item.name} ${item.buildingType} 청약`,
      url: `https://www.mk-land.kr/sale/${id}`,
      description: content?.summary || [
        `${item.location} ${item.buildingType}.`,
        item.totalUnits ? `총 ${item.totalUnits.toLocaleString()}세대.` : '',
        `${priceText}.`,
        item.receiptStart ? `청약접수 ${item.receiptStart}~${item.receiptEnd}.` : '',
      ].filter(Boolean).join(' '),
      address: {
        '@type': 'PostalAddress',
        streetAddress: item.location,
        addressRegion: item.region,
        addressCountry: 'KR',
      },
      additionalProperty: [
        { '@type': 'PropertyValue', name: '건물유형', value: item.buildingType },
        { '@type': 'PropertyValue', name: '공급유형', value: item.supplyType },
        { '@type': 'PropertyValue', name: '총세대수', value: String(item.totalUnits ?? '') },
        { '@type': 'PropertyValue', name: '청약접수시작', value: item.receiptStart },
        { '@type': 'PropertyValue', name: '청약접수종료', value: item.receiptEnd },
        { '@type': 'PropertyValue', name: '당첨자발표', value: item.winnerDate },
        { '@type': 'PropertyValue', name: '시공사', value: item.constructionCompany },
        { '@type': 'PropertyValue', name: '사업주체', value: item.businessEntity },
      ].filter(p => p.value),
    };

    if (item.minPrice > 0) {
      jsonLd.offers = {
        '@type': 'Offer',
        priceCurrency: 'KRW',
        price: item.minPrice,
        availability:
          item.status === '청약중'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/PreOrder',
      };
    }

    if (content?.thumbnail_url) {
      jsonLd.image = content.thumbnail_url;
    }

    return jsonLd;
  } catch {
    return null;
  }
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jsonLd, content] = await Promise.all([buildJsonLd(id), getContent(id)]);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SaleDetailClient content={content} />
    </>
  );
}
