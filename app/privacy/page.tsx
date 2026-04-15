import GlobalNav from '../components/GlobalNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 청약정보 mk-land.kr',
  description: 'mk-land.kr 서비스의 개인정보처리방침입니다. 수집하는 정보, 이용 목적, 광고 및 쿠키 사용에 대해 안내합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/privacy' },
};

export default function PrivacyPage() {
  return (
    <div>
      <GlobalNav />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', lineHeight: 1.8, color: '#374151' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>개인정보처리방침</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>최종 수정일: 2026년 4월 15일</p>

        <p>청약정보 mk-land.kr(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 정보의 종류와 이용 목적, 제3자 공유 여부 등을 안내합니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>1. 수집하는 정보</h2>
        <p>본 서비스는 청약정보 조회, 아파트 실거래가 조회, 부동산 계산기 이용 시 별도의 개인정보(이름, 연락처, 이메일 등)를 직접 수집하지 않습니다. 다만 서비스 이용 과정에서 다음 정보가 자동으로 수집될 수 있습니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>브라우저 종류 및 버전</li>
          <li>운영체제 종류</li>
          <li>접속 IP 주소 (익명화 처리)</li>
          <li>방문 페이지 및 체류 시간</li>
          <li>유입 경로 (검색엔진, 링크 등)</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>2. 쿠키(Cookie) 사용</h2>
        <p>본 서비스는 이용자 경험 개선 및 광고 서비스 제공을 위해 쿠키를 사용합니다. 쿠키는 웹사이트가 브라우저에 저장하는 소량의 데이터 파일입니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>서비스 이용 기록 분석 (Google Analytics)</li>
          <li>맞춤형 광고 제공 (Google AdSense)</li>
          <li>이용자 선호 설정 유지</li>
        </ul>
        <p style={{ marginTop: 8 }}>브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능이 제한될 수 있습니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>3. Google AdSense 및 맞춤 광고</h2>
        <p>본 서비스는 Google AdSense를 통해 광고를 게재합니다. Google AdSense는 <strong>DART 쿠키</strong>를 사용하여 이용자가 본 서비스 및 인터넷 상의 다른 사이트를 방문한 기록을 바탕으로 관심 기반(맞춤형) 광고를 표시합니다.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
          <li>Google은 광고 파트너사로서 본 서비스에 광고를 게재하며, 이 과정에서 쿠키를 사용합니다.</li>
          <li>DART 쿠키는 이용자의 IP 주소, 브라우저 정보, 방문 페이지 정보 등을 수집할 수 있습니다.</li>
          <li>수집된 정보는 광고 노출 최적화 목적으로만 사용되며, 이용자를 직접 식별하는 데 사용되지 않습니다.</li>
        </ul>

        <p style={{ marginTop: 16, fontWeight: 600 }}>맞춤 광고 비활성화 방법</p>
        <ul style={{ paddingLeft: 20, marginTop: 8, lineHeight: 2 }}>
          <li>
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
              aboutads.info/choices
            </a>
            {' '}— 광고주 자율 규제 프로그램(DAA)을 통한 맞춤 광고 거부
          </li>
          <li>
            <a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
              networkadvertising.org/choices
            </a>
            {' '}— 네트워크 광고 이니셔티브(NAI)를 통한 광고 거부
          </li>
          <li>
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
              Google 광고 설정
            </a>
            {' '}— Google 계정을 통한 맞춤 광고 직접 관리
          </li>
        </ul>

        <p style={{ marginTop: 12 }}>
          Google의 광고 및 개인정보 보호 정책에 대한 자세한 내용은{' '}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>
            policies.google.com/technologies/ads
          </a>
          에서 확인하실 수 있습니다.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>4. 제3자 정보 제공</h2>
        <p>본 서비스는 이용자의 개인정보를 제3자에게 판매하거나 임의로 제공하지 않습니다. 단, 법령에 의한 요구가 있는 경우 관련 기관에 제공할 수 있습니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>5. 외부 링크</h2>
        <p>본 서비스는 공공데이터포털, 청약홈 등 외부 사이트로 연결되는 링크를 포함할 수 있습니다. 외부 사이트의 개인정보처리방침은 해당 사이트의 정책을 따르며, 본 서비스는 이에 대한 책임을 지지 않습니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>6. 정보 보안</h2>
        <p>본 서비스는 이용자 정보를 보호하기 위해 HTTPS 암호화 통신을 사용하며, 수집된 로그 데이터는 익명화하여 처리합니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>7. 방침 변경</h2>
        <p>본 개인정보처리방침은 법령 또는 서비스 변경에 따라 수정될 수 있습니다. 변경 시 본 페이지에 수정일과 함께 공지합니다.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>8. 문의</h2>
        <p>개인정보 관련 문의사항은 아래 이메일로 연락해 주시기 바랍니다.</p>
        <p style={{ marginTop: 8 }}>이메일: <a href="mailto:multikim@naver.com" style={{ color: '#1d4ed8' }}>multikim@naver.com</a></p>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 13 }}>
          <p>본 방침은 2026년 4월 15일부터 시행됩니다.</p>
        </div>
      </div>
    </div>
  );
}
