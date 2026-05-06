import { cache } from 'react';
import type { Metadata } from 'next';
import { fetchLhRentalItemById, type LhRentalItem } from '@/lib/lhApi';
import RentalDetailClient from './RentalDetailClient';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
};

// lhLeaseNoticeDtlInfo1은 첨부파일 전용 API라 공고명/날짜를 반환하지 않음
// → 목록 API(lhLeaseNoticeInfo1)에서 PAN_ID로 검색해 올바른 데이터 사용
const getRentalItem = cache(async (panId: string): Promise<LhRentalItem | null> => {
  const key = process.env.LH_API_KEY;
  if (!key) return null;
  return fetchLhRentalItemById(key, panId);
});

export async function generateMetadata({ params, searchParams: _sp }: PageProps): Promise<Metadata> {
  const { id } = await params;
  await _sp; // Next.js requires searchParams to be awaited even if unused
  const item = await getRentalItem(id);

  const canonical = `https://www.mk-land.kr/rental/${id}`;

  if (!item) {
    return {
      title: 'LH 임대공고 상세 — mk-land.kr',
      alternates: { canonical },
    };
  }

  const title = `${item.name} — ${item.rentalType} 입주자모집공고`;
  const description = [
    item.location && `${item.location} 소재`,
    item.totalUnits > 0 && `총 ${item.totalUnits.toLocaleString()}세대`,
    item.receiptStart && `접수기간: ${item.receiptStart}${item.receiptEnd ? `~${item.receiptEnd}` : ''}`,
    item.rentalType && `${item.rentalType} 공고`,
  ].filter(Boolean).join('. ');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName: 'mk-land.kr',
    },
    twitter: { card: 'summary', title, description },
    alternates: { canonical },
  };
}

export default async function RentalDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const item = await getRentalItem(id);

  const jsonLd = item ? {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: item.name,
    description: `${item.rentalType} 입주자 모집공고`,
    provider: {
      '@type': 'Organization',
      name: '한국토지주택공사(LH)',
      url: 'https://www.lh.or.kr',
    },
    areaServed: item.location || item.region,
    serviceType: item.rentalType,
    ...(item.receiptStart && {
      availabilityStarts: item.receiptStart,
      availabilityEnds: item.receiptEnd || undefined,
    }),
    url: item.pblancUrl || `https://www.mk-land.kr/rental/${id}`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <RentalDetailClient initialItem={item} panId={id} searchParams={sp} />
    </>
  );
}
