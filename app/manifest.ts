import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '부동산 계산기',
    short_name: '부동산계산기',
    description: '취득세·대출·중도금·중개수수료 무료 계산 및 분양정보',
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
      { name: '분양정보', short_name: '분양정보', url: '/sale', description: '전국 분양정보 확인' },
      { name: '취득세 계산기', short_name: '취득세', url: '/?tab=acquisition', description: '취득세 계산' },
    ],
  };
}
