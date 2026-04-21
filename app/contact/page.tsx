import GlobalNav from '../components/GlobalNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기 | 엠케이랜드',
  description: '엠케이랜드 서비스 이용 중 궁금한 점이나 오류 제보, 개선 의견을 보내주세요.',
  alternates: { canonical: 'https://www.mk-land.kr/contact' },
};

const SERVICES = [
  { label: '청약정보',   desc: '국토교통부 공공데이터 기반 전국 아파트·오피스텔 청약 공고 실시간 제공' },
  { label: '청약달력',   desc: '월별 청약 일정을 달력으로 한눈에 확인, 지역 필터 지원' },
  { label: '실거래가',   desc: '국토교통부 실거래가 공개시스템 기반 아파트 매매 실거래가 조회' },
  { label: '부동산 계산기', desc: '취득세·주택담보대출·중도금 이자·중개수수료·수익률 무료 계산' },
  { label: '분양정보',   desc: '전국 미분양·특별 혜택 분양 단지 모음 (자체 DB)' },
  { label: 'LH 임대공고', desc: '한국토지주택공사 행복주택·국민임대·장기전세 등 입주자 모집공고' },
  { label: '지역별 모아보기', desc: '시도별 청약 일정, 분양 매물, 실거래가를 한 페이지에서 확인' },
  { label: '관심단지',   desc: '청약·분양 단지를 저장해두고 빠르게 다시 확인' },
];

const FAQS = [
  {
    q: '계산 결과가 실제와 다를 수 있나요?',
    a: '본 서비스의 계산 결과는 참고용입니다. 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있으므로 중요한 의사결정 전에는 세무사·법무사·금융기관과 상담하시기 바랍니다.',
  },
  {
    q: '청약정보·분양정보는 얼마나 자주 업데이트되나요?',
    a: '청약정보는 국토교통부 청약홈 공공데이터 API를 통해 실시간으로 제공됩니다. 분양정보(미분양 특별 혜택 단지)는 엠케이랜드 자체 DB로 관리되며 수시로 업데이트됩니다.',
  },
  {
    q: 'LH 임대공고 정보는 어디서 가져오나요?',
    a: '한국토지주택공사(LH) 공식 오픈API를 통해 행복주택·국민임대·통합공공임대·장기전세·영구임대 모집공고를 제공합니다. 최신 공고문은 각 공고의 "공고문 보기" 버튼에서 확인하세요.',
  },
  {
    q: '실거래가 데이터는 얼마나 최신 데이터인가요?',
    a: '국토교통부 실거래가 공개시스템 API 기준으로 제공됩니다. 통상 신고일 기준 30일 이내 데이터가 반영되며, 일부 지역은 갱신이 늦을 수 있습니다.',
  },
  {
    q: '관심단지는 어떻게 저장되나요?',
    a: '관심단지는 별도 회원가입 없이 브라우저 로컬스토리지에 저장됩니다. 브라우저 데이터를 삭제하면 저장된 관심단지도 함께 삭제되니 참고하세요.',
  },
  {
    q: '청약 가점 계산이 맞지 않아요.',
    a: '청약 가점은 무주택기간(최대 32점), 부양가족수(최대 35점), 청약통장 가입기간(최대 17점)으로 구성됩니다. 입력값을 다시 확인해 주시고 계속 오류가 있으면 이메일로 제보 부탁드립니다.',
  },
  {
    q: '서비스 이용 요금이 있나요?',
    a: '모든 계산기와 정보는 완전 무료로 제공됩니다. 광고가 게재되며, 광고 수익으로 서비스를 운영합니다.',
  },
];

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>문의하기</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          서비스 이용 중 궁금한 점이나 개선 의견을 보내주세요
        </p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px 80px', lineHeight: 1.8, color: '#374151' }}>

        {/* 이메일 문의 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '28px 24px', marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e40af', margin: '0 0 8px' }}>이메일 문의</h2>
          <p style={{ fontSize: 14, color: '#374151', margin: '0 0 16px' }}>
            계산기 오류, 데이터 오류, 서비스 개선 의견 등 모든 문의를 받고 있습니다.<br />
            평일 기준 1~2일 내 답변 드립니다.
          </p>
          <a
            href="mailto:multikim@naver.com"
            style={{
              display: 'inline-block', background: '#1d4ed8', color: '#fff',
              padding: '10px 24px', borderRadius: 8, textDecoration: 'none',
              fontSize: 14, fontWeight: 600,
            }}
          >
            multikim@naver.com
          </a>
        </div>

        {/* 제공 서비스 */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1e3a5f' }}>제공 서비스</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 48 }}>
          {SERVICES.map(({ label, desc }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1e3a5f' }}>자주 묻는 질문</h2>
        <div style={{ marginBottom: 48 }}>
          {FAQS.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8, margin: '0 0 8px' }}>Q. {item.q}</p>
              <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>A. {item.a}</p>
            </div>
          ))}
        </div>

        {/* 운영 정보 */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, margin: '0 0 16px', color: '#1e3a5f' }}>운영 정보</h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['서비스명', '엠케이랜드 (mk-land.kr)'],
                ['운영자', '김경래 공인중개사'],
                ['이메일', 'multikim@naver.com'],
                ['도메인', 'www.mk-land.kr'],
                ['데이터 출처', '국토교통부 공공데이터 API, LH 공공데이터 API'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', color: '#6b7280', width: 130, fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: '8px 0', color: '#374151' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
