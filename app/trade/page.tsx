import Link from 'next/link';
import GlobalNav from '../components/GlobalNav';
import TradeClient from './TradeClient';
import TradeTrendSection from './TradeTrendSection';
import type { TradeTrendStats } from './TradeTrendSection';
import type { Metadata } from 'next';
import { fetchTradeList, recentMonths } from '@/lib/tradeApi';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // 실거래가 데이터 1시간 ISR 캐싱

export const metadata: Metadata = {
  title: '아파트 실거래가 조회 — 매매·전세·월세 확인',
  description: '국토교통부 공공데이터 기반 전국 아파트 매매·전세·월세 실거래가를 무료로 조회하세요. 전세가율 자동 계산, 지역별·단지별 상세 내역 한눈에. 아파트집사.',
  keywords: ['아파트 실거래가', '실거래가 조회', '아파트 매매가', '전세 실거래가', '월세 실거래가', '전세가율', '전국 실거래가', '부동산 실거래가', '아파트집사'],
  alternates: { canonical: 'https://www.aptzipsa.kr/trade' },
  openGraph: {
    title: '아파트 실거래가 조회 — 매매·전세·월세 확인 | 아파트집사',
    description: '국토교통부 공공데이터 기반 전국 아파트 매매·전세·월세 실거래가를 무료로 조회하세요. 전세가율 자동 계산, 지역별·단지별 상세 내역 한눈에.',
    url: 'https://www.aptzipsa.kr/trade',
    siteName: '아파트집사',
  },
};

export default async function TradePage() {
  // 서울 강남구(11680) 전월 데이터 SSR 프리로드
  const dealYmd = recentMonths(2)[1].value; // 전달
  let initialItems: import('@/lib/tradeApi').TradeItem[] = [];
  let tradeStats: TradeTrendStats = null;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  await Promise.all([
    fetchTradeList('11680', dealYmd, 1, 200)
      .then(r => { initialItems = r.items ?? []; })
      .catch(() => {}),
    Promise.resolve(
      db.from('trade_stats').select('*').order('stat_date', { ascending: false }).limit(1).maybeSingle()
    ).then(({ data }) => { tradeStats = data ?? null; }).catch(() => {}),
  ]);

  return (
    <div>
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>아파트 실거래가 조회</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          국토교통부 실거래가 공개시스템 · 매매 · 전세 · 월세 · 전세가율
        </p>
      </div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px' }}>

        <TradeTrendSection tradeStats={tradeStats} />

        <TradeClient initialItems={initialItems} initialDong="개포동" />

        {/* SEO 안내 섹션 */}
        <div style={{ marginTop: 60, borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
              실거래가 조회 안내
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
              본 서비스는 국토교통부 실거래가 공개시스템 API를 활용해
              전국 아파트 매매·전세·월세 실거래 정보를 제공합니다.
              시/도 → 시/군/구 선택 후 거래월을 선택하고 매매·전세·월세 탭을 전환하여 조회할 수 있습니다.
              전세 탭에서는 같은 단지의 매매가와 비교한 전세가율도 자동으로 표시됩니다.
            </p>
          </section>

          <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 32 }}>
            <div style={{ padding: 20, background: '#eff6ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>단지별 요약</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                단지 카드를 클릭하면 해당 단지의 거래 내역과 면적별 가격 분포를 확인할 수 있습니다.
              </p>
            </div>
            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>면적별 분포 차트</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                전용면적 대비 거래금액 산점도 차트로 해당 지역 아파트 가격 분포를 한눈에 파악하세요.
              </p>
            </div>
            <div style={{ padding: 20, background: '#fdf4ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b21a8', marginBottom: 6 }}>최근 3년 시세 추이</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                최근 3년 월별 실거래가 추이를 단지별로 확인할 수 있습니다.
              </p>
            </div>
          </section>

          <section style={{ padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>유의사항</h2>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#6b7280' }}>
              본 데이터는 국토교통부 실거래가 공개시스템 API를 통해 제공되며, 신고 기한(계약 후 30일) 관계로
              최신 거래 일부가 반영되지 않을 수 있습니다. 거래 취소 건은 제외 처리됩니다.
              투자 판단의 참고 자료로만 활용하시고, 최종 결정은 전문가와 상담하세요.
            </p>
          </section>

          {/* 관련 도구 & 가이드 */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <a href="/calculator?tab=loan" style={{ padding: '16px 20px', background: '#eff6ff', borderRadius: 12, textDecoration: 'none', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>🏦 대출 상환 계산기</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>월 납입금·총 이자 바로 계산</div>
            </a>
            <a href="/calculator?tab=acquisition" style={{ padding: '16px 20px', background: '#fffbeb', borderRadius: 12, textDecoration: 'none', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>🧾 취득세 계산기</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>주택 수·가격별 세금 확인</div>
            </a>
            <Link href="/apt/mortgage-loan-guide" style={{ padding: '16px 20px', background: '#f0fdf4', borderRadius: 12, textDecoration: 'none', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>📖 주담대 완벽 가이드</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>LTV·DSR 한도 총정리</div>
            </Link>
            <Link href="/apt/capital-gains-tax-real-estate" style={{ padding: '16px 20px', background: '#fdf4ff', borderRadius: 12, textDecoration: 'none', border: '1px solid #e9d5ff' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>📊 양도소득세 가이드</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>매도 전 세금 미리 확인</div>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
