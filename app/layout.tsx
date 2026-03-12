import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "부동산 계산기 - 취득세, 대출, 중개수수료 무료 계산",
  description: "취득세, 대출 원리금 상환, 중도금 이자, 중개수수료, 수익률을 한 번에 계산하세요. 2025년 최신 세율 반영.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6751517797498225"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}