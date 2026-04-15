import type { Metadata } from 'next';
import FavoritesClient from './FavoritesClient';

export const metadata: Metadata = {
  title: '관심 단지 — 저장한 청약·분양 매물 모아보기 | mk-land.kr',
  description: '관심 있는 청약정보와 분양 매물을 한 곳에서 확인하세요. 로그인 없이 브라우저에 저장됩니다.',
  alternates: { canonical: 'https://www.mk-land.kr/favorites' },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
