import GlobalNav from '../components/GlobalNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기 | MK부동산 계산기',
  description: '부동산 계산기 서비스 이용 중 궁금한 점이나 오류 제보, 개선 의견을 보내주세요.',
  alternates: { canonical: 'https://www.mk-land.kr/contact' },
};

export default function ContactPage() {
  return (
    <div>
      <GlobalNav />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px', lineHeight: 1.8, color: '#374151' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>문의하기</h1>
        <p style={{ color: '#6b7280', marginBottom: 40 }}>서비스 이용 중 궁금한 점이나 개선 의견을 보내주세요.</p>

        {/* 이메일 문의 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '28px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✉️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e40af' }}>이메일 문의</h2>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
            계산기 오류, 분양정보 오류, 서비스 개선 의견 등 모든 문의를 받고 있습니다.<br />
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

        {/* FAQ */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 40, marginBottom: 20 }}>자주 묻는 질문</h2>

        {[
          {
            q: '계산 결과가 실제와 다를 수 있나요?',
            a: '본 서비스의 계산 결과는 참고용입니다. 실제 세금·수수료·대출 조건은 개별 상황에 따라 다를 수 있으므로, 중요한 의사결정 전에는 세무사·법무사·금융기관과 상담하시기 바랍니다.',
          },
          {
            q: '분양정보는 얼마나 자주 업데이트되나요?',
            a: '국토교통부 공공데이터 API를 통해 실시간으로 제공됩니다. 데이터 갱신 주기는 공공데이터포털 기준을 따릅니다.',
          },
          {
            q: '청약 가점 계산이 맞지 않아요.',
            a: '청약 가점은 무주택기간(최대 32점), 부양가족수(최대 35점), 청약통장 가입기간(최대 17점)으로 구성됩니다. 입력값을 다시 확인해 주시고, 계속 오류가 있으면 이메일로 제보 부탁드립니다.',
          },
          {
            q: '서비스 이용 요금이 있나요?',
            a: '모든 계산기와 정보는 완전 무료로 제공됩니다.',
          },
        ].map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
            <p style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>Q. {item.q}</p>
            <p style={{ fontSize: 14, color: '#4b5563' }}>A. {item.a}</p>
          </div>
        ))}

        {/* 운영 정보 */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px', marginTop: 40 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>운영 정보</h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['서비스명', 'MK부동산 계산기'],
                ['운영자', '김경래 공인중개사'],
                ['이메일', 'multikim@naver.com'],
                ['도메인', 'www.mk-land.kr'],
                ['데이터 출처', '국토교통부 공공데이터 API'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', color: '#6b7280', width: 120, fontWeight: 600 }}>{label}</td>
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
