import Link from 'next/link';
import type { Metadata } from 'next';
import GlobalNav from './components/GlobalNav';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 | mk-land',
  description: '요청하신 페이지를 찾을 수 없습니다. 주소를 다시 확인하거나 홈으로 이동해주세요.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 16px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e3a5f', margin: '20px 0 10px' }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8, marginBottom: 36 }}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.<br />
          주소를 다시 확인하거나 아래 링크를 이용해주세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 40 }}>
          <Link href="/" style={{
            display: 'inline-block', background: '#1d4ed8', color: '#fff',
            fontWeight: 700, fontSize: 15, padding: '12px 32px', borderRadius: 30, textDecoration: 'none',
          }}>홈으로 돌아가기</Link>
          <Link href="/calculator" style={{
            display: 'inline-block', background: '#fff', color: '#1e3a5f',
            fontWeight: 600, fontSize: 14, padding: '10px 24px', borderRadius: 30, textDecoration: 'none',
            border: '1px solid #e5e7eb',
          }}>부동산 계산기 바로가기</Link>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, fontWeight: 600 }}>자주 찾는 페이지</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {[
              { href: '/', label: '📋 청약정보' },
              { href: '/calendar', label: '📅 청약달력' },
              { href: '/trade', label: '📊 실거래가' },
              { href: '/unsold', label: '🏷️ 분양정보' },
              { href: '/rental', label: '🏘 임대정보' },
              { href: '/apt', label: '📰 부동산정보' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600,
                padding: '6px 14px', background: '#f3f4f6', borderRadius: 20,
              }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
