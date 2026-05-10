'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/unsold',       label: '미분양 매물',   icon: '🏠' },
  { href: '/admin/blog',         label: '블로그',        icon: '📝' },
  { href: '/admin/sale-content', label: '청약 콘텐츠',   icon: '✍️' },
  { href: '/admin/unsold/leads', label: '관심고객',      icon: '📞' },
  { href: '/admin/mgm/leads',    label: 'MGM',           icon: '🤝' },
  { href: '/admin/push',         label: '푸시 알림',     icon: '🔔' },
  { href: '/admin/insta-card',   label: '인스타 카드',   icon: '📸' },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    router.push('/admin');
  };

  return (
    <header style={{ background: '#1e293b', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      {/* 상단 행: 로고 + 로그아웃 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 18 }}>🏠</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>아파트집사 관리자</span>
        </Link>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 13, color: '#94a3b8', background: 'none', border: '1px solid #334155',
            cursor: 'pointer', padding: '5px 12px', borderRadius: 7,
          }}
        >
          로그아웃
        </button>
      </div>

      {/* 하단 행: 내비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '0 20px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderTop: '1px solid #2d3f55',
      }}>
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '10px 14px',
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? '#fff' : '#94a3b8',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
