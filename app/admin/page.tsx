import { cookies } from 'next/headers';
import Link from 'next/link';
import LoginForm from './LoginForm';

const MENUS = [
  {
    href: '/admin/unsold',
    emoji: '🏠',
    title: '미분양 매물 관리',
    desc: '잔여세대·청약중 매물을 등록·수정·삭제합니다.',
    color: '#eff6ff',
    border: '#bfdbfe',
    titleColor: '#1d4ed8',
  },
  {
    href: '/admin/sale-content',
    emoji: '✍️',
    title: '청약 에디토리얼 콘텐츠',
    desc: '청약홈 API 페이지에 커스텀 설명·이미지를 추가해 SEO를 강화합니다.',
    color: '#f0fdf4',
    border: '#bbf7d0',
    titleColor: '#166534',
  },
];

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;

  if (!isAdmin) return <LoginForm />;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🏠 mk-land 관리자</span>
        <Link href="/api/admin/logout" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>로그아웃</Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>관리자 대시보드</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 36px' }}>관리할 항목을 선택하세요.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {MENUS.map(m => (
            <Link
              key={m.href}
              href={m.href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: m.color, border: `1px solid ${m.border}`,
                borderRadius: 16, padding: '28px 24px',
                transition: 'box-shadow 0.15s, transform 0.15s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 14 }}>{m.emoji}</div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: m.titleColor, margin: '0 0 8px' }}>{m.title}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>{m.desc}</p>
                <div style={{ marginTop: 18, fontSize: 13, fontWeight: 700, color: m.titleColor }}>관리하기 →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
