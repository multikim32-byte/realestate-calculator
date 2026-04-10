import GlobalNav from '../components/GlobalNav';
import TradeClient from './TradeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '아파트 실거래가 조회 — 지역별 최신 매매 거래가 | 부동산 계산기',
  description: '국토교통부 실거래가 공개시스템 기반. 서울·경기·인천 등 전국 아파트 매매 실거래가를 지역·월별로 조회하세요. 단지별 거래 내역, 면적별 가격 분포 차트 제공.',
  alternates: { canonical: 'https://www.mk-land.kr/trade' },
  openGraph: {
    title: '아파트 실거래가 조회 | 부동산 계산기',
    description: '국토부 실거래가 데이터를 지역·월별로 한눈에 확인하세요.',
    url: 'https://www.mk-land.kr/trade',
  },
};

export default function TradePage() {
  return (
    <div>
      <GlobalNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
            아파트 실거래가 조회
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            국토교통부 실거래가 공개시스템 · 지역·월 선택 후 조회
          </p>
        </div>

        <TradeClient />

        {/* SEO 안내 섹션 */}
        <div style={{ marginTop: 60, borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
              실거래가 조회 안내
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
              본 서비스는 국토교통부 실거래가 공개시스템(RTMSOBJSvc) API를 활용해
              전국 아파트 매매 실거래 정보를 제공합니다.
              시/도 → 시/군/구 선택 후 거래월을 선택하면 해당 지역의 실제 매매 거래 내역을 조회할 수 있습니다.
            </p>
          </section>

          <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 32 }}>
            <div style={{ padding: 20, background: '#eff6ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>단지별 요약</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                단지 카드를 클릭하면 해당 단지의 거래 내역과 면적별 가격 분포를 확인할 수 있습니다.
              </p>
            </div>
            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 6 }}>면적별 분포 차트</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                전용면적 대비 거래금액 산점도 차트로 해당 지역 아파트 가격 분포를 한눈에 파악하세요.
              </p>
            </div>
            <div style={{ padding: 20, background: '#fdf4ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6b21a8', marginBottom: 6 }}>최근 3년 시세 추이</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                최근 3년 월별 실거래가 추이를 단지별로 확인할 수 있습니다.
              </p>
            </div>
          </section>

          <section style={{ padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>유의사항</h2>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#6b7280' }}>
              본 데이터는 국토교통부 실거래가 공개시스템 API를 통해 제공되며, 신고 기한(계약 후 30일) 관계로
              최신 거래 일부가 반영되지 않을 수 있습니다. 거래 취소 건은 제외 처리됩니다.
              투자 판단의 참고 자료로만 활용하시고, 최종 결정은 전문가와 상담하세요.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
