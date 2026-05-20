import type { Metadata } from "next";
import { Noto_Sans_KR } from 'next/font/google';
import Link from 'next/link';
import Script from "next/script";
import BookmarkToast from "./components/BookmarkToast";
import WebVitals from "./components/WebVitals";
import BottomNav from "./components/BottomNav";

const notoSansKr = Noto_Sans_KR({
  weight: ['400', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-kr',
});

const BASE_URL = 'https://www.aptzipsa.kr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "아파트 청약·분양정보·실거래가·부동산 계산기 | 아파트집사",
    template: "%s | 아파트집사",
  },
  description: "전국 아파트 청약정보·분양정보·실거래가를 한눈에. 취득세·대출·중개수수료 계산기, 부동산 지도, LH 임대공고, 청약달력 무료 제공. 집 살 때, 아파트집사.",
  keywords: ["아파트 청약정보", "분양정보", "실거래가", "청약 일정", "취득세 계산기", "주택담보대출", "중개수수료 계산기", "부동산 지도", "LH 임대공고", "청약달력", "미분양", "아파트집사"],
  authors: [{ name: "아파트집사" }],
  creator: "아파트집사",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "아파트집사",
    title: "아파트 청약·분양정보·실거래가·부동산 계산기 | 아파트집사",
    description: "전국 아파트 청약·분양정보·실거래가를 한눈에. 취득세·대출·중개수수료 계산기, 부동산 지도, LH 임대공고 무료 제공.",
    images: [{ url: '/opengraph-image?v=2', width: 1200, height: 630, alt: '아파트집사 — 청약·분양정보·실거래가·부동산 계산기' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "아파트 청약·분양정보·실거래가·부동산 계산기 | 아파트집사",
    description: "전국 아파트 청약·분양정보·실거래가를 한눈에. 취득세·대출·중개수수료 계산기, 부동산 지도, LH 임대공고 무료 제공.",
    images: ['/opengraph-image?v=2'],
  },
  verification: {
    google: ['RAqDPK6ChEYWgVUEXLItRYmja-LdtaytbxpW9dXuAk8', '9YoCpDyF7EL6xbhUdP3NjT5jl1fNuYQW_YC_Yb8KLxo'],
    other: { 'naver-site-verification': '41df8473c50b96914c865e2564fa4393d44492d2' },
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <body className={notoSansKr.variable} style={{ fontFamily: "'Apple SD Gothic Neo', var(--font-kr), sans-serif" }}>
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
          strategy="lazyOnload"
        />
        {children}
        <WebVitals />
        <BookmarkToast />
        <BottomNav />
        {/* 모바일 탭바 높이만큼 푸터 위 여백 — PC에서는 미적용 */}
        <style>{`@media (max-width: 899px) { body { padding-bottom: calc(56px + env(safe-area-inset-bottom)); } }`}</style>
        <footer style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '24px 16px', marginTop: 40 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>© 2026 아파트집사 · 전국 아파트 청약·분양정보·실거래가·부동산 계산기 무료 제공</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="/about" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>서비스 소개</a>
              <a href="/terms" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>이용약관</a>
              <a href="/privacy" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>개인정보처리방침</a>
              <Link href="/apt" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>부동산 정보</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}