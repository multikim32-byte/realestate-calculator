import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import SaleListClient from './components/SaleListClient';
import GlobalNav from './components/GlobalNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '📋 청약정보 — 전국 아파트·오피스텔 분양 청약 정보 & 실거래가 | mk-land',
  description: '전국 아파트·오피스텔 청약 일정과 인근 실거래가를 한눈에 확인하세요. 국토교통부 공공데이터 기반, 지역별 필터·청약달력·실거래가 조회 지원.',
  alternates: { canonical: 'https://www.mk-land.kr' },
};

export default function Home({ searchParams }: { searchParams: Record<string, string> }) {
  // 구버전 공유 링크 /?tab=loan&... → /calculator?tab=loan&... 로 redirect
  if (searchParams.tab) {
    const qs = new URLSearchParams(searchParams as Record<string, string>).toString();
    redirect(`/calculator?${qs}`);
  }
  return (
    <div>
      <GlobalNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6" style={{ textAlign: 'center' }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">청약정보</h1>
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
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 0" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>🗺 지역별 청약·분양 모아보기</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'].map(r => (
                <a key={r} href={`/region/${encodeURIComponent(r)}`}
                  style={{ padding: "6px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, textDecoration: "none", fontSize: 13, color: "#374151", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  {r}
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* 청약정보 안내 */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 60px" }}>
          <section style={{ marginTop: 48, marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", marginBottom: 12 }}>청약정보 이용 안내</h2>
            <p style={{ lineHeight: 1.8, color: "#374151", fontSize: 15 }}>
              국토교통부 공공데이터 청약홈 API를 활용해 전국 아파트·오피스텔·도시형 생활주택·(공공지원)민간임대 주택의
              분양 공고 정보를 실시간으로 제공합니다. 청약 상세 페이지에서 인근 실거래가도 함께 확인할 수 있습니다.
            </p>
          </section>

          <section style={{ marginBottom: 40, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div style={{ padding: "20px", background: "#eff6ff", borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>아파트 분양</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151" }}>
                전국 신규 아파트 분양 공고를 확인하세요. 청약 신청일, 당첨자 발표일, 입주 예정일, 공급 세대수 등 핵심 정보를 제공합니다.
              </p>
            </div>
            <div style={{ padding: "20px", background: "#f0fdf4", borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#166534", marginBottom: 8 }}>아파트 잔여세대</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151" }}>
                1순위 청약 미달 또는 계약 취소로 발생한 잔여 세대 정보입니다. 청약통장 없이도 선착순으로 신청 가능한 경우가 많습니다.
              </p>
            </div>
            <div style={{ padding: "20px", background: "#fdf4ff", borderRadius: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#6b21a8", marginBottom: 8 }}>오피스텔·민간임대</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151" }}>
                오피스텔, 도시형 생활주택, (공공지원)민간임대 주택 분양 정보입니다. 청약 자격이 아파트보다 완화된 상품이 많습니다.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: 40, padding: "24px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f", marginBottom: 16 }}>청약 전 반드시 확인할 사항</h2>
            <ol style={{ paddingLeft: 20, lineHeight: 2.2, color: "#374151", fontSize: 14 }}>
              <li><strong>청약 자격 확인:</strong> 무주택 여부, 청약통장 가입 기간 및 납입 횟수, 세대주 여부를 먼저 확인하세요.</li>
              <li><strong>공급유형:</strong> 특별공급(신혼·생애최초·다자녀 등)과 일반공급 중 본인이 신청 가능한 유형을 확인하세요.</li>
              <li><strong>청약 신청일:</strong> 특별공급과 일반공급 1·2순위 신청일이 다릅니다. 입주자 모집공고를 꼼꼼히 읽으세요.</li>
              <li><strong>분양가 및 중도금:</strong> 분양가, 계약금 비율, 중도금 납부 일정과 대출 조건을 사전에 확인하세요.</li>
              <li><strong>청약홈 공식 확인:</strong> 최종 청약은 반드시 청약홈(applyhome.co.kr) 공식 사이트에서 신청하세요.</li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f", marginBottom: 12 }}>유의사항</h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#6b7280" }}>
              본 페이지의 청약정보는 국토교통부 공공데이터포털 API를 통해 제공되며, 실제 공고 내용과 다를 수 있습니다.
              청약 신청 전 반드시 청약홈(applyhome.co.kr) 공식 입주자 모집공고를 확인하시기 바랍니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
