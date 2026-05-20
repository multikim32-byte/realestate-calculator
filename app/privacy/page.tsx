import Link from 'next/link';
import GlobalNav from '../components/GlobalNav';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '아파트집사 서비스의 개인정보처리방침입니다. 수집하는 정보, 이용 목적, 광고 및 쿠키 사용에 대해 안내합니다.',
  alternates: { canonical: 'https://www.aptzipsa.kr/privacy' },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 36, marginBottom: 12, color: '#1e293b', paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
    {children}
  </h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.9, margin: '0 0 10px' }}>{children}</p>
);

const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 10 }}>
    {items.map((item, i) => (
      <li key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.9, marginBottom: 4 }}>{item}</li>
    ))}
  </ul>
);

const Table = ({ rows }: { rows: [string, string][] }) => (
  <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
    {rows.map(([label, value], i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '160px 1fr',
        background: i % 2 === 0 ? '#fff' : '#f9fafb',
        borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
        padding: '10px 16px', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{value}</span>
      </div>
    ))}
  </div>
);

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>개인정보처리방침</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>최종 수정일: 2026년 5월 20일</p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px', lineHeight: 1.8, color: '#374151' }}>

        <P>
          아파트집사(이하 &quot;서비스&quot;)는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
          본 방침은 서비스가 수집하는 정보의 종류와 이용 목적, 제3자 공유 여부 등을 안내합니다.
        </P>

        <H2>1. 개인정보 처리 현황</H2>
        <P>본 서비스는 아래와 같이 이용자의 개인정보를 수집·이용합니다.</P>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>① 자동 수집 정보 (서비스 이용 시)</p>
          <Table rows={[
            ['수집 항목', '브라우저 종류·버전, 운영체제, 접속 IP(익명화), 방문 페이지·체류 시간, 유입 경로'],
            ['수집 목적', '서비스 이용 분석 및 품질 개선'],
            ['보유 기간', 'Google Analytics 정책에 따름 (최대 26개월)'],
          ]} />

          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '16px 0 8px' }}>② 관심 고객 등록 폼 (미분양 분양정보 상세 페이지)</p>
          <Table rows={[
            ['수집 항목', '이름, 전화번호'],
            ['수집 목적', '분양 상담 연결 및 분양사 정보 전달'],
            ['보유 기간', '수집일로부터 1년 또는 이용자 삭제 요청 시까지'],
            ['제공 대상', '해당 분양 단지 담당자 (분양 상담 목적)'],
          ]} />

          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '16px 0 8px' }}>③ MGM(지인 추천) 신청 폼 (청약 상세 페이지)</p>
          <Table rows={[
            ['수집 항목', '이름, 생년월일, 전화번호, 주소'],
            ['수집 목적', '지인 추천 프로그램 참여 확인 및 분양사 전달'],
            ['보유 기간', '수집일로부터 1년 또는 이용자 삭제 요청 시까지'],
            ['제공 대상', '해당 청약 단지 담당자 (MGM 확인 목적)'],
          ]} />

          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '16px 0 8px' }}>④ 푸시 알림 구독 (청약 알림 서비스)</p>
          <Table rows={[
            ['수집 항목', '브라우저 푸시 구독 토큰(endpoint, 암호화 키), 관심 청약 단지 목록'],
            ['수집 목적', '청약 시작일 사전 알림 발송'],
            ['보유 기간', '구독 해지 시까지 (브라우저에서 직접 해지 가능)'],
          ]} />

          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '16px 0 8px' }}>⑤ 관심단지 저장</p>
          <Table rows={[
            ['수집 항목', '관심 단지 ID (브라우저 로컬스토리지에만 저장)'],
            ['수집 목적', '관심단지 목록 유지'],
            ['보유 기간', '브라우저 데이터 삭제 시까지 (서버 미전송)'],
          ]} />
        </div>

        <H2>2. 개인정보 열람·수정·삭제 요청</H2>
        <P>이용자는 수집된 개인정보(관심 고객 등록, MGM 신청, 푸시 구독)의 열람·수정·삭제를 요청할 수 있습니다.</P>
        <P>요청은 아래 이메일로 연락해 주시면 7영업일 이내 처리합니다.</P>
        <P>이메일: <a href="mailto:multikim@naver.com" style={{ color: '#1d4ed8' }}>multikim@naver.com</a></P>

        <H2>3. 쿠키(Cookie) 사용</H2>
        <P>본 서비스는 이용자 경험 개선 및 광고 서비스 제공을 위해 쿠키를 사용합니다.</P>
        <UL items={[
          '서비스 이용 기록 분석 (Google Analytics)',
          '맞춤형 광고 제공 (Google AdSense)',
          '이용자 선호 설정 유지',
        ]} />
        <P>브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능이 제한될 수 있습니다.</P>

        <H2>4. Google AdSense 및 맞춤 광고</H2>
        <P>
          본 서비스는 Google AdSense를 통해 광고를 게재합니다. Google AdSense는 <strong>DART 쿠키</strong>를 사용하여
          이용자의 인터넷 방문 기록을 바탕으로 관심 기반(맞춤형) 광고를 표시합니다.
        </P>
        <UL items={[
          'Google은 광고 파트너사로서 본 서비스에 광고를 게재하며, 이 과정에서 쿠키를 사용합니다.',
          'DART 쿠키는 이용자의 IP 주소, 브라우저 정보, 방문 페이지 정보 등을 수집할 수 있습니다.',
          '수집된 정보는 광고 노출 최적화 목적으로만 사용되며, 이용자를 직접 식별하는 데 사용되지 않습니다.',
        ]} />

        <p style={{ marginTop: 16, fontWeight: 600, fontSize: 14, color: '#374151' }}>맞춤 광고 비활성화 방법</p>
        <UL items={[
          <><a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>aboutads.info/choices</a> — DAA 맞춤 광고 거부</>,
          <><a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>networkadvertising.org/choices</a> — NAI 광고 거부</>,
          <><a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>Google 광고 설정</a> — Google 계정을 통한 직접 관리</>,
        ]} />
        <P>
          Google의 광고 및 개인정보 보호 정책:{' '}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
            policies.google.com/technologies/ads
          </a>
        </P>

        <H2>5. 제3자 정보 제공</H2>
        <P>
          본 서비스는 이용자의 개인정보를 제3자에게 판매하거나 임의로 제공하지 않습니다.
          단, 관심 고객 등록·MGM 신청 시 수집된 정보는 이용자가 직접 동의한 범위 내에서 해당 분양 단지 담당자에게 제공됩니다.
          법령에 의한 요구가 있는 경우 관련 기관에 제공할 수 있습니다.
        </P>

        <H2>6. 외부 링크</H2>
        <P>
          본 서비스는 공공데이터포털, 청약홈, LH 한국토지주택공사 등 외부 사이트로 연결되는 링크를 포함할 수 있습니다.
          외부 사이트의 개인정보처리방침은 해당 사이트의 정책을 따르며, 본 서비스는 이에 대한 책임을 지지 않습니다.
        </P>

        <H2>7. 정보 보안</H2>
        <P>
          본 서비스는 이용자 정보를 보호하기 위해 HTTPS 암호화 통신을 사용하며,
          수집된 로그 데이터는 익명화하여 처리합니다. 푸시 알림 구독 토큰은 암호화된 상태로 저장됩니다.
        </P>

        <H2>8. 방침 변경</H2>
        <P>본 개인정보처리방침은 법령 또는 서비스 변경에 따라 수정될 수 있습니다. 변경 시 본 페이지에 수정일과 함께 공지합니다.</P>

        <H2>9. 문의 및 개인정보 관리 책임자</H2>
        <Table rows={[
          ['서비스명', '아파트집사'],
          ['운영자', '김경래 공인중개사'],
          ['이메일', 'multikim@naver.com'],
          ['처리 기간', '7영업일 이내'],
        ]} />

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>본 방침은 2026년 5월 20일부터 시행됩니다.</span>
          <a href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>이용약관</a>
          <a href="/about" style={{ color: '#6b7280', textDecoration: 'none' }}>서비스 소개</a>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>홈으로</Link>
        </div>
      </div>
    </div>
  );
}
