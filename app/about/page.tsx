import GlobalNav from '../components/GlobalNav';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 소개 | 부동산 계산기',
  description: '부동산 계산기 서비스 소개 페이지입니다. 취득세, 대출, 중도금, 중개수수료, 분양정보까지 한곳에서 확인하세요.',
  alternates: { canonical: 'https://www.mk-land.kr/about' },
};

export default function AboutPage() {
  return (
    <div>
      <GlobalNav />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', lineHeight: 1.8, color: '#374151' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>서비스 소개</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>부동산 계산기 · 분양정보 · 부동산 정보 한눈에</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>무엇을 제공하나요?</h2>
        <p>본 서비스는 부동산 거래 시 반드시 필요한 다양한 계산기와 정보를 무료로 제공합니다. 복잡한 세금 계산이나 대출 이자 계산을 쉽고 빠르게 해결할 수 있도록 설계되었습니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>주요 기능</h2>
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #1d4ed8' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>취득세 계산기</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>주택 가격과 보유 주택 수에 따른 2026년 최신 취득세율을 즉시 계산합니다. 생애최초 감면 혜택도 반영됩니다.</p>
          </div>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #059669' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>대출 원리금 계산기</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>원리금균등상환, 원금균등상환, 만기일시상환 방식별 월 납입금과 총 이자를 비교 계산합니다.</p>
          </div>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #d97706' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>중도금 이자 계산기</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>분양 아파트 중도금 납부 일정에 따른 이자를 회차별로 정확하게 계산합니다.</p>
          </div>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #7c3aed' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>중개수수료 계산기</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>2026년 기준 중개수수료 요율표를 바탕으로 거래 유형별 최대 수수료를 계산합니다.</p>
          </div>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #dc2626' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>분양정보</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>전국 아파트·오피스텔·도시형 생활주택의 신규 분양 정보를 실시간으로 제공합니다. 공공데이터 API를 활용해 매일 최신 정보를 반영합니다.</p>
          </div>
          <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, borderLeft: '4px solid #0891b2' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>부동산 정보 블로그</h3>
            <p style={{ fontSize: 14, color: '#6b7280' }}>취득세, 대출, 양도소득세, 주택담보대출 등 부동산 거래에 필요한 핵심 정보를 쉽게 설명합니다.</p>
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>왜 만들었나요?</h2>
        <p>부동산 거래는 대부분의 사람에게 인생에서 가장 큰 금융 결정입니다. 그런데 취득세, 대출 이자, 중도금 이자 등 각종 비용을 계산하려면 여러 사이트를 돌아다녀야 했습니다.</p>
        <p style={{ marginTop: 8 }}>본 서비스는 부동산 거래에 필요한 모든 계산과 정보를 한 곳에서 무료로 제공하기 위해 만들어졌습니다. 복잡한 수식 없이 숫자만 입력하면 즉시 결과를 확인할 수 있습니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>데이터 출처</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>분양 정보: 공공데이터포털 청약홈 API (국토교통부)</li>
          <li>취득세율: 지방세법 및 2026년 기준 개정 내용</li>
          <li>중개수수료: 공인중개사법 시행규칙 2026년 기준</li>
          <li>대출 계산: 금융감독원 금융계산기 기준 공식 적용</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>운영자 소개</h2>
        <div style={{ background: '#f9fafb', padding: '20px', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>👤</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>김경래 공인중개사</p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>부동산 정보 제공 · 계산기 서비스 운영</p>
            <p style={{ fontSize: 14, color: '#374151' }}>취득세·대출·청약·임대차 등 실생활에 필요한 부동산 정보를 누구나 쉽게 이해할 수 있도록 정리하고, 직접 사용하기 편한 계산 도구를 만들어 제공합니다.</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>운영 도메인: www.mk-land.kr · 이메일: multikim@naver.com</p>
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>주의사항</h2>
        <p>본 서비스의 계산 결과는 참고용이며, 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있습니다. 중요한 의사결정 전에는 전문가(세무사, 법무사, 금융기관)와 상담하시기 바랍니다.</p>

        <div style={{ marginTop: 48, padding: '24px', background: '#eff6ff', borderRadius: 8 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>문의 및 제안</p>
          <p style={{ fontSize: 14 }}>서비스 개선 의견이나 오류 제보는 아래 이메일로 연락해 주세요.</p>
          <p style={{ marginTop: 8 }}>이메일: <a href="mailto:multikim@naver.com" style={{ color: '#1d4ed8' }}>multikim@naver.com</a></p>
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/calculator" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>계산기 바로가기</Link>
          <Link href="/" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>분양정보 바로가기</Link>
          <Link href="/apt" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>부동산 정보</Link>
          <Link href="/privacy" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
