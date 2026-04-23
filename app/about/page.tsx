import GlobalNav from '../components/GlobalNav';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ClipboardList, Calendar, BarChart2, TrendingUp, MapPin,
  Calculator, BookOpen, Tag, Building2, Map, Star, Trophy,
} from 'lucide-react';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '서비스 소개 | 엠케이랜드',
  description: '전국 아파트·오피스텔 청약 정보, 실거래가 조회, LH 임대공고, 부동산 계산기(취득세·대출·중도금·중개수수료)를 무료로 제공합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/about' },
};

const features = [
  {
    icon: ClipboardList, color: '#1d4ed8',
    title: '청약정보',
    desc: '전국 아파트·오피스텔·도시형 생활주택의 신규 분양 청약 일정을 실시간으로 제공합니다. 청약 시작일·마감일·당첨자 발표일까지 한눈에 확인하세요.',
    link: '/', linkText: '청약정보 보기',
  },
  {
    icon: Calendar, color: '#0891b2',
    title: '청약달력',
    desc: '이번 달·다음 달 청약 일정을 달력으로 한눈에 확인합니다. 지역 필터와 청약홈 공식 링크를 함께 제공합니다.',
    link: '/calendar', linkText: '청약달력 보기',
  },
  {
    icon: Trophy, color: '#7c3aed',
    title: '청약 경쟁률',
    desc: '청약 마감 후 한국부동산원 청약홈 API를 통해 주택형·순위·거주지역별 실시간 경쟁률을 조회합니다.',
    link: '/', linkText: '청약정보 보기',
  },
  {
    icon: Tag, color: '#d97706',
    title: '분양정보',
    desc: '전국 미분양·특별 혜택 분양 단지를 모아 제공합니다. 잔여 세대, 분양가, 혜택 정보를 한눈에 확인하세요.',
    link: '/unsold', linkText: '분양정보 보기',
  },
  {
    icon: Building2, color: '#059669',
    title: 'LH 임대공고',
    desc: '한국토지주택공사(LH) 행복주택·국민임대·통합공공임대·장기전세·영구임대 입주자 모집공고를 제공합니다.',
    link: '/rental', linkText: '임대공고 보기',
  },
  {
    icon: BarChart2, color: '#059669',
    title: '아파트 실거래가 조회',
    desc: '국토교통부 실거래가 공개시스템 데이터를 기반으로 시도·시군구·읍면동별 실거래 내역을 조회합니다. 단지별 최저·최고·평균가와 전체 거래 목록을 제공합니다.',
    link: '/trade', linkText: '실거래가 조회',
  },
  {
    icon: TrendingUp, color: '#0891b2',
    title: '아파트 시세 추이 차트',
    desc: '단지를 선택하면 최근 3년간 월별 평균 실거래가 추이를 차트로 보여줍니다. 면적별 필터와 3년 최고·최저·최근 평균가 요약을 함께 제공합니다.',
    link: '/trade', linkText: '실거래가 조회',
  },
  {
    icon: Map, color: '#6366f1',
    title: '지역별 모아보기',
    desc: '시도별로 청약 일정, 분양 매물, 실거래가를 한 페이지에서 확인합니다. 17개 시도 전체를 지원합니다.',
    link: '/region/서울', linkText: '지역별 보기',
  },
  {
    icon: MapPin, color: '#d97706',
    title: '단지 위치 지도',
    desc: '실거래가 조회에서 단지를 선택하면 카카오맵으로 정확한 위치를 확인할 수 있습니다.',
    link: '/trade', linkText: '실거래가 조회',
  },
  {
    icon: Calculator, color: '#dc2626',
    title: '부동산 계산기',
    desc: '취득세·대출 원리금·중도금 이자·중개수수료·수익률을 한 페이지에서 무료로 계산합니다. 2026년 최신 세율과 수수료 요율표를 반영했습니다.',
    link: '/calculator', linkText: '계산기 바로가기',
  },
  {
    icon: Star, color: '#f59e0b',
    title: '관심단지',
    desc: '청약·분양 단지를 즐겨찾기로 저장해두고 빠르게 다시 확인합니다. 별도 회원가입 없이 브라우저에 저장됩니다.',
    link: '/favorites', linkText: '관심단지 보기',
  },
  {
    icon: BookOpen, color: '#6b7280',
    title: '부동산 정보 블로그',
    desc: '취득세·양도소득세·주택담보대출·청약 전략 등 부동산 거래에 필요한 핵심 정보를 알기 쉽게 정리합니다.',
    link: '/apt', linkText: '정보 보기',
  },
];

const dataSources = [
  { label: '청약 정보',   src: '국토교통부 청약홈 API (한국부동산원)' },
  { label: '청약 경쟁률', src: '한국부동산원 청약홈 APT 경쟁률 API (공공데이터포털)' },
  { label: '실거래가',    src: '국토교통부 아파트 매매 실거래가 공개시스템 API' },
  { label: 'LH 임대공고', src: '한국토지주택공사(LH) 공공데이터 오픈API' },
  { label: '지도',        src: '카카오맵 SDK' },
  { label: '취득세율',    src: '지방세법 2026년 기준' },
  { label: '중개수수료',  src: '공인중개사법 시행규칙 2026년 기준' },
  { label: '대출 계산',   src: '금융감독원 금융계산기 공식 적용' },
];

const quickLinks = [
  { href: '/',           label: '청약정보',    bg: '#1d4ed8', color: '#fff' },
  { href: '/calendar',   label: '청약달력',    bg: '#0891b2', color: '#fff' },
  { href: '/unsold',     label: '분양정보',    bg: '#d97706', color: '#fff' },
  { href: '/rental',     label: 'LH 임대공고', bg: '#059669', color: '#fff' },
  { href: '/trade',      label: '실거래가',    bg: '#059669', color: '#fff' },
  { href: '/calculator', label: '부동산 계산기', bg: '#dc2626', color: '#fff' },
  { href: '/region/서울', label: '지역별',     bg: '#6366f1', color: '#fff' },
  { href: '/apt',        label: '부동산 정보', bg: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' },
];

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>서비스 소개</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          청약·실거래가·임대공고·계산기를 한 곳에서 — mk-land.kr
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px', lineHeight: 1.8, color: '#374151' }}>

        {/* 한줄 소개 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '20px 24px', marginBottom: 48 }}>
          <p style={{ margin: 0, fontSize: 15, color: '#1e3a8a', lineHeight: 1.9 }}>
            부동산 거래에 필요한 <strong>청약 정보·실거래가·LH 임대공고·계산기</strong>를 하나의 서비스에서 무료로 제공합니다.
            공공데이터 API를 활용해 매일 최신 정보를 반영하며, 복잡한 계산도 숫자만 입력하면 즉시 결과를 확인할 수 있습니다.
          </p>
        </div>

        {/* 주요 기능 */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>주요 기능</h2>
        <div style={{ display: 'grid', gap: 12, marginBottom: 48 }}>
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} style={{
                background: '#fff', padding: '18px 20px', borderRadius: 12,
                borderLeft: `4px solid ${f.color}`, display: 'flex', gap: 16, alignItems: 'flex-start',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  background: `${f.color}15`, borderRadius: 10,
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color={f.color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{f.title}</h3>
                    <Link href={f.link} style={{
                      fontSize: 11, color: f.color, textDecoration: 'none', fontWeight: 600,
                      border: `1px solid ${f.color}`, borderRadius: 20, padding: '2px 8px',
                    }}>
                      {f.linkText} →
                    </Link>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 데이터 출처 */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>데이터 출처</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 48 }}>
          {dataSources.map((d, i) => (
            <div key={d.label} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr', padding: '12px 20px',
              background: i % 2 === 0 ? '#fff' : '#f9fafb',
              borderBottom: i < dataSources.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{d.label}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{d.src}</span>
            </div>
          ))}
        </div>

        {/* 운영자 */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>운영자</h2>
        <div style={{ background: '#fff', padding: '24px', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 48 }}>
          <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: '#1e293b', margin: '0 0 4px' }}>김경래 공인중개사</p>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8, margin: '0 0 8px' }}>부동산 정보 제공 · 청약정보 & 실거래가 서비스 운영</p>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: '0 0 8px' }}>
            취득세·대출·청약·임대차 등 실생활에 필요한 부동산 정보를 누구나 쉽게 이해할 수 있도록 정리하고, 직접 사용하기 편한 계산·조회 도구를 만들어 제공합니다.
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            www.mk-land.kr &nbsp;·&nbsp; multikim@naver.com
          </p>
        </div>

        {/* 주의사항 */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#92400e', margin: '0 0 6px' }}>주의사항</p>
          <p style={{ fontSize: 14, color: '#78350f', margin: 0, lineHeight: 1.8 }}>
            본 서비스의 계산 결과 및 조회 데이터는 참고용이며, 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있습니다.
            중요한 의사결정 전에는 전문가(세무사·법무사·금융기관)와 상담하시기 바랍니다.
          </p>
        </div>

        {/* 문의 */}
        <div style={{ background: '#eff6ff', borderRadius: 12, padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#1e3a8a', margin: '0 0 6px' }}>문의 및 제안</p>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
            서비스 개선 의견이나 오류 제보는 이메일로 연락해 주세요.&nbsp;
            <a href="mailto:multikim@naver.com" style={{ color: '#1d4ed8', fontWeight: 600 }}>multikim@naver.com</a>
          </p>
        </div>

        {/* 바로가기 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {quickLinks.map(({ href, label, bg, color, border }) => (
            <Link key={href} href={href} style={{
              padding: '9px 18px', background: bg, color, borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
              border: border ?? 'none',
            }}>{label}</Link>
          ))}
        </div>

      </div>
    </div>
  );
}
