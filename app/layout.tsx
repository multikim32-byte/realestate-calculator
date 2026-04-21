import type { Metadata } from "next";
import Script from "next/script";

const BASE_URL = 'https://www.mk-land.kr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "청약정보 & 실거래가 — 전국 분양·청약 일정 한눈에 | mk-land",
    template: "%s | mk-land",
  },
  description: "전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요. 청약달력, 실거래가 조회, 부동산 계산기(취득세·대출·중도금) 무료 제공.",
  keywords: ["부동산 계산기", "취득세 계산기", "주택담보대출", "중도금 이자", "중개수수료", "분양정보", "청약", "수익률 계산"],
  authors: [{ name: "부동산 계산기" }],
  creator: "부동산 계산기",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "엠케이랜드",
    title: "청약정보 & 실거래가 — 전국 아파트·오피스텔 분양 청약 정보",
    description: "전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요. 청약달력, 실거래가 조회, 부동산 계산기 무료 제공.",
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '부동산 계산기' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "청약정보 & 실거래가 — 전국 아파트·오피스텔 분양 청약 정보",
    description: "전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요. 청약달력, 실거래가 조회, 부동산 계산기 무료 제공.",
    images: ['/opengraph-image'],
  },
  verification: {
    google: 'RAqDPK6ChEYWgVUEXLItRYmja-LdtaytbxpW9dXuAk8',
    other: { 'naver-site-verification': 'bcba8a5bb1b134d013e9e06b23c7616efca70c3d' },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6751517797498225" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="청약정보" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`
        }} />
      </head>
      <body style={{ fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
        {/* Google Analytics GA4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RMGGDLYPB7"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-RMGGDLYPB7');
        `}</Script>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6751517797498225"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
        <footer style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '24px 16px', marginTop: 40 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>© 2026 엠케이랜드 · 전국 아파트·오피스텔 분양 청약 정보 &amp; 실거래가 | mk-land.kr</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="/about" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>서비스 소개</a>
              <a href="/terms" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>이용약관</a>
              <a href="/privacy" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>개인정보처리방침</a>
              <a href="/apt" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>부동산 정보</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}