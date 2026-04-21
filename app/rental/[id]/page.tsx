import type { Metadata } from 'next';
import RentalDetailClient from './RentalDetailClient';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: 'LH 임대공고 상세 | mk-land.kr',
    alternates: { canonical: `https://www.mk-land.kr/rental/${params.id}` },
  };
}

export default function RentalDetailPage() {
  return <RentalDetailClient />;
}
