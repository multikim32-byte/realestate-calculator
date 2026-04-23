import GlobalNav from '../components/GlobalNav';
import CalendarClient from './CalendarClient';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '2026년 청약 달력 — 이번 달 청약 일정 한눈에 | 부동산 계산기',
  description: '2026년 4월·5월 아파트·오피스텔 청약 일정을 달력으로 확인하세요. 지역별 필터, 청약 시작일·종료일, 청약홈 바로가기 링크 제공.',
  alternates: { canonical: 'https://www.mk-land.kr/calendar' },
  openGraph: {
    title: '2026년 청약 달력 | 부동산 계산기',
    description: '이번 달 전국 청약 일정을 달력으로 한눈에 확인하세요.',
    url: 'https://www.mk-land.kr/calendar',
  },
};

export default function CalendarPage() {
  return (
    <div>
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>청약 달력</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          이번 달·다음 달 청약 일정을 한눈에 확인하세요 · 청약홈 공식 링크 제공
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8">

        <CalendarClient />

        {/* SEO 안내 섹션 */}
        <div style={{ marginTop: 60, borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>
              청약 달력 이용 안내
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151' }}>
              본 달력은 국토교통부 청약홈 공공데이터 API를 기반으로 전국 아파트·오피스텔·도시형 생활주택의
              청약 일정을 실시간으로 제공합니다. 청약 시작일 기준으로 달력에 표시되며,
              지역 필터를 통해 원하는 지역의 청약 일정만 확인할 수 있습니다.
            </p>
          </section>

          <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 32 }}>
            <div style={{ padding: 20, background: '#eff6ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>청약 시작일 기준</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                달력의 각 날짜는 청약 접수 시작일 기준입니다. 날짜를 클릭하면 해당 일에 시작하는 청약 상세 정보를 볼 수 있습니다.
              </p>
            </div>
            <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>진행 중인 청약</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                이전 달에 시작해 현재 접수 중인 청약은 달력 하단 "진행 중인 청약" 섹션에서 확인할 수 있습니다.
              </p>
            </div>
            <div style={{ padding: 20, background: '#fdf4ff', borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#6b21a8', marginBottom: 6 }}>청약홈 바로가기</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
                각 청약 항목에서 청약홈 공식 모집공고 링크를 바로 열 수 있습니다. 최종 청약은 청약홈에서 진행하세요.
              </p>
            </div>
          </section>

          <section style={{ padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>유의사항</h2>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#6b7280' }}>
              본 달력의 청약 일정은 국토교통부 공공데이터포털 API를 통해 제공되며, 실제 공고와 다를 수 있습니다.
              청약 신청 전 반드시 <strong>청약홈(applyhome.co.kr)</strong> 공식 입주자 모집공고를 확인하시기 바랍니다.
              본 서비스는 정보 제공 목적으로만 운영되며, 청약 결과에 대한 책임을 지지 않습니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
