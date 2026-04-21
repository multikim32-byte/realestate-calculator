import GlobalNav from '../components/GlobalNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | 엠케이랜드',
  description: 'mk-land.kr 서비스 이용약관입니다. 서비스 이용 조건, 책임 한계, 면책 조항 등을 안내합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/terms' },
};

const sections = [
  {
    title: '제1조 (목적)',
    content: `본 약관은 엠케이랜드 mk-land.kr(이하 "서비스")이 제공하는 모든 서비스의 이용 조건 및 절차, 운영자와 이용자의 권리·의무·책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (서비스 정의)',
    content: `서비스는 다음 기능을 무료로 제공합니다.`,
    list: [
      '전국 아파트·오피스텔 청약 정보 및 청약 경쟁률 조회',
      '월별 청약 일정 달력',
      '아파트 실거래가 조회 및 시세 추이 차트',
      '전국 분양정보 (미분양·특별 혜택 단지)',
      'LH 임대공고 (행복주택·국민임대·통합공공임대·장기전세 등)',
      '지역별 청약·분양·실거래가 모아보기',
      '부동산 계산기 (취득세·대출 원리금·중도금 이자·중개수수료·수익률)',
      '관심단지 저장 기능',
      '부동산 관련 정보 및 블로그 콘텐츠',
    ],
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    content: `① 본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.\n② 운영자는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 즉시 효력이 발생합니다.\n③ 변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단할 수 있습니다.`,
  },
  {
    title: '제4조 (서비스 이용)',
    content: `① 서비스는 별도의 회원가입 없이 누구나 이용할 수 있습니다.\n② 이용자는 서비스를 개인적·비상업적 목적으로만 이용할 수 있습니다.\n③ 서비스의 콘텐츠를 무단으로 복제·배포·상업적으로 이용하는 행위는 금지됩니다.`,
  },
  {
    title: '제5조 (정보의 정확성 및 면책)',
    content: `① 서비스에서 제공하는 계산 결과, 청약 정보, 실거래가 데이터는 공공데이터 API 및 관련 법령을 기반으로 하며 참고용입니다.\n② 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있으며, 중요한 의사결정 전 반드시 전문가(세무사·법무사·금융기관)와 상담하시기 바랍니다.\n③ 공공데이터 API의 오류·지연·누락으로 인한 정보 불일치에 대해 운영자는 책임을 지지 않습니다.\n④ 서비스 이용으로 발생한 손해에 대해 운영자는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.`,
  },
  {
    title: '제6조 (광고)',
    content: `① 서비스는 Google AdSense를 통해 광고를 게재할 수 있습니다.\n② 광고 콘텐츠는 Google의 정책에 따라 제공되며, 운영자는 광고 내용에 대한 책임을 지지 않습니다.\n③ 이용자는 브라우저 설정을 통해 맞춤형 광고를 비활성화할 수 있습니다.`,
  },
  {
    title: '제7조 (지식재산권)',
    content: `① 서비스 내 콘텐츠(텍스트·UI·로고 등)의 저작권은 운영자에게 있습니다.\n② 공공데이터 API로 제공되는 정보의 저작권은 해당 공공기관(국토교통부·한국부동산원 등)에 있습니다.\n③ 이용자는 서비스 콘텐츠를 운영자의 사전 동의 없이 상업적으로 이용할 수 없습니다.`,
  },
  {
    title: '제8조 (서비스 변경 및 중단)',
    content: `① 운영자는 서비스 내용을 변경하거나 일시 중단할 수 있습니다.\n② 서비스 중단으로 인한 이용자의 손해에 대해 운영자는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.`,
  },
  {
    title: '제9조 (준거법 및 분쟁 해결)',
    content: `① 본 약관은 대한민국 법령에 따라 해석됩니다.\n② 서비스 이용과 관련한 분쟁은 민사소송법상의 관할 법원을 제1심 법원으로 합니다.`,
  },
  {
    title: '제10조 (문의)',
    content: `서비스 이용 관련 문의사항은 아래 이메일로 연락해 주시기 바랍니다.\n이메일: multikim@naver.com`,
  },
];

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>이용약관</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>시행일: 2026년 4월 10일</p>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', lineHeight: 1.8, color: '#374151' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sections.map((s, i) => (
            <div key={i}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                {s.title}
              </h2>
              {s.content.split('\n').map((line, j) => (
                <p key={j} style={{ margin: '0 0 6px', fontSize: 14, color: '#374151', lineHeight: 1.9 }}>{line}</p>
              ))}
              {s.list && (
                <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                  {s.list.map((item, j) => (
                    <li key={j} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 13 }}>
          <p>본 약관은 2026년 4월 10일부터 시행됩니다.</p>
          <p style={{ marginTop: 4 }}>운영: 엠케이랜드 mk-land.kr · <a href="mailto:multikim@naver.com" style={{ color: '#6b7280' }}>multikim@naver.com</a></p>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}>개인정보처리방침</a>
          <a href="/about" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>서비스 소개</a>
          <a href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>홈으로</a>
        </div>

      </div>
    </div>
  );
}
