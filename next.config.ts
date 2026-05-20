import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.com' },
      { protocol: 'https', hostname: 'pub-850f6f7273f44951a2bc7d320cd99166.r2.dev' },
    ],
  },
  async headers() {
    // AdSense/GA/Kakao Maps 등 외부 스크립트 허용 + 기본 XSS 방어
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://adservice.google.com https://dapi.kakao.com https://t1.kakaocdn.net https://t1.daumcdn.net https://ssl.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.com https://www.google-analytics.com https://analytics.google.com https://dapi.kakao.com https://pub-850f6f7273f44951a2bc7d320cd99166.r2.dev",
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy',    value: csp },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // mk-land.kr → aptzipsa.kr (구 도메인 → 신 도메인 301)
      {
        source: '/',
        has: [{ type: 'host', value: 'mk-land.kr' }],
        destination: 'https://www.aptzipsa.kr/',
        permanent: true,
      },
      {
        source: '/',
        has: [{ type: 'host', value: 'www.mk-land.kr' }],
        destination: 'https://www.aptzipsa.kr/',
        permanent: true,
      },
      {
        source: '/:path+',
        has: [{ type: 'host', value: 'mk-land.kr' }],
        destination: 'https://www.aptzipsa.kr/:path+',
        permanent: true,
      },
      {
        source: '/:path+',
        has: [{ type: 'host', value: 'www.mk-land.kr' }],
        destination: 'https://www.aptzipsa.kr/:path+',
        permanent: true,
      },
      // non-www → www 리다이렉트 (canonical 통일)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'aptzipsa.kr' }],
        destination: 'https://www.aptzipsa.kr/:path*',
        permanent: true,
      },
      {
        source: '/apt/acquisition-tax-guide-2025',
        destination: '/apt/acquisition-tax-guide',
        permanent: true,
      },
      {
        source: '/apt/mortgage-loan-complete-guide-2025',
        destination: '/apt/mortgage-loan-complete-guide',
        permanent: true,
      },
      {
        source: '/blog/dsr-calculation-guide',
        destination: '/blog/dsr-ratio-loan-limit-strategy',
        permanent: true,
      },
      {
        source: '/blog/apartment-management-fee-guide',
        destination: '/blog/apartment-management-fee-saving-tips',
        permanent: true,
      },
      // 중복 페이지 해소 — apt → blog 정본으로 통합
      {
        source: '/apt/dsr-calculation-guide',
        destination: '/blog/dsr-ratio-loan-limit-strategy',
        permanent: true,
      },
      {
        source: '/apt/prepayment-penalty-guide',
        destination: '/blog/mortgage-prepayment-strategy',
        permanent: true,
      },
      {
        source: '/sitemap_index.xml',
        destination: '/sitemap.xml',
        permanent: false,
      },
      {
        source: '/blog/mk-land-real-estate-tools-guide',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog/mk-land-unsold-listing-launch-2026',
        destination: '/blog',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
