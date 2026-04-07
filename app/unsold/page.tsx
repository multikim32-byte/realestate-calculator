import type { Metadata } from 'next';
import GlobalNav from '../components/GlobalNav';
import UnsoldChart from '../components/UnsoldChart';
import UnsoldAptCard from '../components/UnsoldAptCard';
import ChecklistSection from '../components/ChecklistSection';
import { getUnsoldData } from '../../lib/getUnsoldData';
import { unsoldApts } from '../../data/unsoldApts';

export const metadata: Metadata = {
  title: '미분양 특가 아파트 — 지역별 현황',
  description: '전국 미분양 아파트 현황과 특가 단지를 한눈에 확인하세요. KOSIS 공식 통계 기반 지역별 미분양 세대수와 계약 혜택 정보를 제공합니다.',
  alternates: { canonical: 'https://www.mk-land.kr/unsold' },
};

const section: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '0 16px',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: '28px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
};

export default async function UnsoldPage() {
  const { items, basePeriod } = await getUnsoldData();
  const highlighted = unsoldApts.filter(a => a.highlight);
  const rest = unsoldApts.filter(a => !a.highlight);
  const sorted = [...highlighted, ...rest];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>미분양 특가 아파트</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          KOSIS 공식 통계 기반 지역별 미분양 현황 · 특가 단지 모음
        </p>
      </div>

      <div style={{ ...section, paddingTop: 32, paddingBottom: 64 }}>

        {/* 섹션 1: 지역별 미분양 현황 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: '0 0 16px' }}>
            📊 지역별 미분양 현황
          </h2>
          <div style={card}>
            <UnsoldChart items={items} basePeriod={basePeriod} />
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            출처: 국토교통부 주택통계 (KOSIS)  · 매월 갱신
          </p>
        </section>

        {/* 섹션 2: 주목 단지 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: '0 0 4px' }}>
            🏠 주목 단지
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
            계약 혜택이 큰 단지를 선별했습니다. 공식 페이지에서 최신 정보를 꼭 확인하세요.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {sorted.map(apt => (
              <UnsoldAptCard key={apt.id} apt={apt} />
            ))}
          </div>
        </section>

        {/* 섹션 3: 계약 체크리스트 */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: '0 0 4px' }}>
            ✅ 계약 전 체크리스트
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
            미분양 계약 전 아래 5가지를 계산기로 직접 확인해보세요.
          </p>
          <ChecklistSection />
        </section>

      </div>
    </div>
  );
}
