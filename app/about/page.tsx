import GlobalNav from '../components/GlobalNav';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 소개 | 청약정보 mk-land.kr',
  description: '전국 아파트·오피스텔 청약 정보, 실거래가 조회, 청약 경쟁률, 시세 추이 차트, 부동산 계산기(취득세·대출·중도금·중개수수료)를 무료로 제공합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/about' },
};

const features = [
  {
    icon: '🏢',
    color: '#1d4ed8',
    title: '청약정보',
    desc: '전국 아파트·오피스텔·도시형 생활주택의 신규 분양 청약 일정을 실시간으로 제공합니다. 청약 시작일·마감일·당첨자 발표일까지 한눈에 확인하세요.',
    link: '/',
    linkText: '청약정보 보기',
  },
  {
    icon: '🏆',
    color: '#7c3aed',
    title: '청약 경쟁률',
    desc: '청약 마감 후 한국부동산원 청약홈 API를 통해 주택형·순위·거주지역별 실시간 경쟁률을 조회합니다. 데이터가 없는 경우 청약홈 바로가기 링크를 제공합니다.',
    link: '/',
    linkText: '청약정보 보기',
  },
  {
    icon: '📊',
    color: '#059669',
    title: '아파트 실거래가 조회',
    desc: '국토교통부 실거래가 공개시스템 데이터를 기반으로 시도·시군구·읍면동별 실거래 내역을 조회합니다. 단지별 최저·최고·평균가와 전체 거래 목록을 제공합니다.',
    link: '/trade',
    linkText: '실거래가 조회',
  },
  {
    icon: '📈',
    color: '#0891b2',
    title: '아파트 시세 추이 차트',
    desc: '단지를 선택하면 최근 3년간 월별 평균 실거래가 추이를 차트로 보여줍니다. 면적별 필터와 3년 최고·최저·최근 평균가 요약 카드를 함께 제공합니다.',
    link: '/trade',
    linkText: '실거래가 조회',
  },
  {
    icon: '📍',
    color: '#d97706',
    title: '단지 위치 지도',
    desc: '실거래가 조회에서 단지를 선택하면 카카오맵으로 정확한 위치를 확인할 수 있습니다. 주소 기반 지오코딩과 키워드 검색을 결합해 정확도를 높였습니다.',
    link: '/trade',
    linkText: '실거래가 조회',
  },
  {
    icon: '🧮',
    color: '#dc2626',
    title: '부동산 계산기',
    desc: '취득세·대출 원리금·중도금 이자·중개수수료를 한 페이지에서 무료로 계산합니다. 2026년 최신 세율과 수수료 요율표를 반영했습니다.',
    link: '/calculator',
    linkText: '계산기 바로가기',
  },
  {
    icon: '📰',
    color: '#6b7280',
    title: '부동산 정보 블로그',
    desc: '취득세·양도소득세·주택담보대출·청약 전략 등 부동산 거래에 필요한 핵심 정보를 알기 쉽게 정리합니다.',
    link: '/apt',
    linkText: '정보 보기',
  },
];

const dataSources = [
  { label: '청약 정보', src: '국토교통부 청약홈 API (한국부동산원)' },
  { label: '청약 경쟁률', src: '한국부동산원_청약홈_APT 경쟁률 API (공공데이터포털)' },
  { label: '실거래가', src: '국토교통부 아파트 매매 실거래가 공개시스템 API' },
  { label: '지도', src: '카카오맵 SDK' },
  { label: '취득세율', src: '지방세법 2026년 기준' },
  { label: '중개수수료', src: '공인중개사법 시행규칙 2026년 기준' },
  { label: '대출 계산', src: '금융감독원 금융계산기 공식 적용' },
];

export default function AboutPage() {
  return (
    <div>
      <GlobalNav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px', lineHeight: 1.8, color: '#374151' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>서비스 소개</h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            청약정보 · 실거래가 조회 · 시세 추이 · 부동산 계산기를 한 곳에서 — <strong>mk-land.kr</strong>
          </p>
        </div>

        {/* 한줄 소개 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ margin: 0, fontSize: 15, color: '#1e3a8a', lineHeight: 1.9 }}>
            부동산 거래에 필요한 <strong>청약 정보·실거래가·계산기</strong>를 하나의 서비스에서 무료로 제공합니다.
            공공데이터 API를 활용해 매일 최신 정보를 반영하며, 복잡한 계산도 숫자만 입력하면 즉시 결과를 확인할 수 있습니다.
          </p>
        </div>

        {/* 주요 기능 */}
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>주요 기능</h2>
        <div style={{ display: 'grid', gap: 14, marginBottom: 48 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#f9fafb', padding: '20px 24px', borderRadius: 12, borderLeft: `4px solid ${f.color}`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{f.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{f.title}</h3>
                  <Link href={f.link} style={{ fontSize: 12, color: f.color, textDecoration: 'none', fontWeight: 600, background: '#fff', border: `1px solid ${f.color}`, borderRadius: 20, padding: '2px 10px' }}>
                    {f.linkText} →
                  </Link>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 데이터 출처 */}
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>데이터 출처</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 48 }}>
          {dataSources.map((d, i) => (
            <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', padding: '12px 20px', background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: i < dataSources.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{d.label}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{d.src}</span>
            </div>
          ))}
        </div>

        {/* 운영자 */}
        <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>운영자</h2>
        <div style={{ background: '#f9fafb', padding: '24px', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 48, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>👤</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#1e293b' }}>김경래 공인중개사</p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>부동산 정보 제공 · 청약정보 & 실거래가 서비스 운영</p>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
              취득세·대출·청약·임대차 등 실생활에 필요한 부동산 정보를 누구나 쉽게 이해할 수 있도록 정리하고, 직접 사용하기 편한 계산·조회 도구를 만들어 제공합니다.
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
              운영 도메인: www.mk-land.kr &nbsp;·&nbsp; 이메일: multikim@naver.com
            </p>
          </div>
        </div>

        {/* 주의사항 */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#92400e' }}>주의사항</p>
          <p style={{ fontSize: 14, color: '#78350f', margin: 0, lineHeight: 1.8 }}>
            본 서비스의 계산 결과 및 조회 데이터는 참고용이며, 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있습니다.
            중요한 의사결정 전에는 전문가(세무사·법무사·금융기관)와 상담하시기 바랍니다.
          </p>
        </div>

        {/* 문의 */}
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#1e3a8a' }}>문의 및 제안</p>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
            서비스 개선 의견이나 오류 제보는 이메일로 연락해 주세요.
            &nbsp;<a href="mailto:multikim@naver.com" style={{ color: '#1d4ed8', fontWeight: 600 }}>multikim@naver.com</a>
          </p>
        </div>

        {/* 바로가기 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '9px 20px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>청약정보</Link>
          <Link href="/trade" style={{ padding: '9px 20px', background: '#059669', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>실거래가 조회</Link>
          <Link href="/calculator" style={{ padding: '9px 20px', background: '#7c3aed', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>부동산 계산기</Link>
          <Link href="/apt" style={{ padding: '9px 20px', background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>부동산 정보</Link>
          <Link href="/privacy" style={{ padding: '9px 20px', background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>개인정보처리방침</Link>
        </div>

      </div>
    </div>
  );
}
