import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SaleListClient from './components/SaleListClient';
import GlobalNav from './components/GlobalNav';
import type { Metadata } from 'next';
import { Calendar, BarChart2, Calculator, Tag, Map, Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '청약정보 — 전국 아파트·오피스텔 분양 청약 정보 & 실거래가 | mk-land',
  description: '전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요. 국토교통부 공공데이터 기반, 지역별 필터·청약달력·실거래가 조회 지원.',
  alternates: { canonical: 'https://www.mk-land.kr' },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: '엠케이랜드',
      url: 'https://www.mk-land.kr',
      description: '전국 아파트·오피스텔 청약 정보, 실거래가 조회, 부동산 계산기를 무료로 제공합니다.',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://www.mk-land.kr/?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: '엠케이랜드',
      url: 'https://www.mk-land.kr',
      logo: 'https://www.mk-land.kr/icon-192.png',
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'multikim@naver.com' },
    },
  ],
};

const QUICK_LINKS = [
  { href: '/calendar',   label: '청약달력',  desc: '일정 한눈에',   icon: Calendar,  bg: '#eff6ff', color: '#1d4ed8' },
  { href: '/trade',      label: '실거래가',  desc: '시세 조회',     icon: BarChart2, bg: '#f0fdf4', color: '#166534' },
  { href: '/calculator', label: '계산기',    desc: '취득세·대출',   icon: Calculator, bg: '#fdf4ff', color: '#6b21a8' },
  { href: '/unsold',     label: '분양정보',  desc: '미분양 매물',   icon: Tag,       bg: '#fff7ed', color: '#92400e' },
  { href: '/rental',     label: '임대정보',  desc: 'LH 임대공고',   icon: Building2, bg: '#f0fdf4', color: '#065f46' },
  { href: '/region/서울', label: '지역별',   desc: '시도별 보기',   icon: Map,       bg: '#f5f3ff', color: '#5b21b6' },
];

const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

export default function Home({ searchParams }: { searchParams: Record<string, string> }) {
  if (searchParams.tab) {
    const qs = new URLSearchParams(searchParams as Record<string, string>).toString();
    redirect(`/calculator?${qs}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <GlobalNav />

      {/* ── 히어로 섹션 ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        padding: '48px 16px 40px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>
          국토교통부 공공데이터 기반
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
          전국 부동산 정보
        </h1>
        <p style={{ fontSize: 15, color: '#bfdbfe', margin: '0 0 36px', lineHeight: 1.6 }}>
          청약 일정 · 실거래가 · 분양정보 · 계산기까지 무료로
        </p>

        {/* 퀵링크 카드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          maxWidth: 540,
          margin: '0 auto',
        }}>
          {QUICK_LINKS.map(({ href, label, desc, icon: Icon, bg, color }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff',
                borderRadius: 14,
                padding: '16px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                transition: 'transform 0.15s',
              }}>
                <div style={{
                  background: bg, borderRadius: 10,
                  width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 청약정보 목록 ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6" style={{ textAlign: 'center' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">청약정보</h2>
          <p className="text-gray-500 text-sm">청약 일정부터 인근 실거래가까지 한눈에</p>
        </div>

        <Suspense fallback={null}>
          <SaleListClient
            initialItems={[]}
            initialTotal={0}
            dataSource="loading"
          />
        </Suspense>

        {/* 지역별 모아보기 */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 0' }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>지역별 청약·분양 모아보기</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGIONS.map(r => (
                <Link key={r} href={`/region/${encodeURIComponent(r)}`} style={{
                  padding: '6px 14px', background: '#fff',
                  border: '1px solid #e5e7eb', borderRadius: 20,
                  textDecoration: 'none', fontSize: 13, color: '#374151',
                  fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {r}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 인기 가이드 */}
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>인기 부동산 가이드</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { href: '/apt/apartment-subscription-guide-2026', label: '2026 청약 완벽 가이드' },
                { href: '/apt/acquisition-tax-guide',             label: '취득세 계산 가이드' },
                { href: '/apt/mortgage-loan-guide',               label: '주택담보대출 가이드' },
                { href: '/apt/new-apartment-subscription-score',  label: '청약 가점 높이는 법' },
                { href: '/apt/fixed-vs-variable-rate-2026',       label: '고정 vs 변동금리' },
                { href: '/apt/didimdol-loan-guide',               label: '디딤돌대출 가이드' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  padding: '10px 14px', background: '#fff',
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  textDecoration: 'none', fontSize: 13, color: '#374151',
                  fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'block',
                }}>
                  {label} →
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 청약정보 안내 */}
        <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 60 }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>청약정보 이용 안내</h2>
            <p style={{ lineHeight: 1.8, color: '#374151', fontSize: 15 }}>
              국토교통부 공공데이터 청약홈 API를 활용해 전국 아파트·오피스텔·도시형 생활주택·(공공지원)민간임대 주택의
              분양 공고 정보를 실시간으로 제공합니다. 청약 상세 페이지에서 인근 실거래가도 함께 확인할 수 있습니다.
            </p>
          </section>

          <section style={{ marginBottom: 40, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div style={{ padding: '20px', background: '#eff6ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 8 }}>아파트 분양</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                전국 신규 아파트 분양 공고를 확인하세요. 청약 신청일, 당첨자 발표일, 입주 예정일, 공급 세대수 등 핵심 정보를 제공합니다.
              </p>
            </div>
            <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 8 }}>아파트 잔여세대</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                1순위 청약 미달 또는 계약 취소로 발생한 잔여 세대 정보입니다. 청약통장 없이도 선착순으로 신청 가능한 경우가 많습니다.
              </p>
            </div>
            <div style={{ padding: '20px', background: '#fdf4ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b21a8', marginBottom: 8 }}>오피스텔·민간임대</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                오피스텔, 도시형 생활주택, (공공지원)민간임대 주택 분양 정보입니다. 청약 자격이 아파트보다 완화된 상품이 많습니다.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: 40, padding: '24px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 }}>청약 전 반드시 확인할 사항</h2>
            <ol style={{ paddingLeft: 20, lineHeight: 2.2, color: '#374151', fontSize: 14 }}>
              <li><strong>청약 자격 확인:</strong> 무주택 여부, 청약통장 가입 기간 및 납입 횟수, 세대주 여부를 먼저 확인하세요.</li>
              <li><strong>공급유형:</strong> 특별공급(신혼·생애최초·다자녀 등)과 일반공급 중 본인이 신청 가능한 유형을 확인하세요.</li>
              <li><strong>청약 신청일:</strong> 특별공급과 일반공급 1·2순위 신청일이 다릅니다. 입주자 모집공고를 꼼꼼히 읽으세요.</li>
              <li><strong>분양가 및 중도금:</strong> 분양가, 계약금 비율, 중도금 납부 일정과 대출 조건을 사전에 확인하세요.</li>
              <li><strong>청약홈 공식 확인:</strong> 최종 청약은 반드시 청약홈(applyhome.co.kr) 공식 사이트에서 신청하세요.</li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>유의사항</h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#6b7280' }}>
              본 페이지의 청약정보는 국토교통부 공공데이터포털 API를 통해 제공되며, 실제 공고 내용과 다를 수 있습니다.
              청약 신청 전 반드시 청약홈(applyhome.co.kr) 공식 입주자 모집공고를 확인하시기 바랍니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
