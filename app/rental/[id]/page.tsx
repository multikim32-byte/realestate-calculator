import type { Metadata } from 'next';
import RentalDetailClient from './RentalDetailClient';

export const metadata: Metadata = {
  title: 'LH 임대공고 상세 | mk-land.kr',
};

export default function RentalDetailPage() {
  return <RentalDetailClient />;
}
