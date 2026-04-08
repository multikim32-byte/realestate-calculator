import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '청약정보 & 실거래가',
    short_name: '청약정보',
    description: '전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요.',
    id: 'https://www.mk-land.kr/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    orientation: 'portrait',
    categories: ['finance', 'utilities'],
    lang: 'ko',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '청약달력', short_name: '청약달력', url: '/calendar', description: '청약 일정 달력' },
      { name: '실거래가 조회', short_name: '실거래가', url: '/trade', description: '아파트 실거래가 조회' },
      { name: '부동산 계산기', short_name: '계산기', url: '/calculator', description: '취득세·대출 계산' },
    ],
  };
}
