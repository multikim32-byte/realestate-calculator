'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ClipboardList, Tag, Map, BarChart2, MoreHorizontal,
  Calendar, Calculator, Building2, BookOpen, Star, Mail, X,
} from 'lucide-react';

const TABS = [
  { href: '/',       label: '청약',    icon: ClipboardList, exact: true },
  { href: '/unsold', label: '미분양',  icon: Tag },
  { href: '/map',    label: '지도',    icon: Map },
  { href: '/trade',  label: '실거래가', icon: BarChart2 },
];

const MORE_ITEMS = [
  { href: '/calendar',     label: '청약달력',  icon: Calendar },
  { href: '/calculator',   label: '계산기',    icon: Calculator },
  { href: '/rental',       label: '임대정보',  icon: Building2 },
  { href: '/region/서울',  label: '지역별',    icon: Map },
  { href: '/apt',          label: '부동산정보', icon: BookOpen },
  { href: '/favorites',    label: '관심단지',  icon: Star },
  { href: '/contact',      label: '문의',      icon: Mail },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // admin 페이지에서는 숨김
  if (pathname.startsWith('/admin')) return null;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === '/';
    return pathname.startsWith(href);
  }

  const closeMore = () => setMoreOpen(false);

  return (
    <>
      <style>{`
        .bottom-nav-bar { display: flex; }
        @media (min-width: 900px) { .bottom-nav-bar { display: none !important; } }
      `}</style>

      {/* 배경 오버레이 */}
      {moreOpen && (
        <div
          onClick={closeMore}
          style={{
            position: 'fixed', inset: 0, zIndex: 298,
            background: 'rgba(0,0,0,0.45)',
          }}
        />
      )}

      {/* 더보기 슬라이드업 패널 */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0,
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          zIndex: 299,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.13)',
          transform: moreOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          padding: '16px 16px 20px',
          pointerEvents: moreOpen ? 'auto' : 'none',
        }}
        className="bottom-nav-bar"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>더보기</span>
          <button
            onClick={closeMore}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMore}
              style={{
                textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 14,
                background: pathname.startsWith(href) ? '#eff6ff' : '#f8fafc',
              }}
            >
              <Icon size={22} color={pathname.startsWith(href) ? '#1d4ed8' : '#6b7280'} strokeWidth={2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: pathname.startsWith(href) ? '#1d4ed8' : '#374151' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 탭바 */}
      <nav
        className="bottom-nav-bar"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(56px + env(safe-area-inset-bottom))',
          alignItems: 'stretch',
        }}
      >
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMore}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, paddingTop: 8,
                textDecoration: 'none',
                color: active ? '#1d4ed8' : '#9ca3af',
                borderTop: active ? '2px solid #1d4ed8' : '2px solid transparent',
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}

        {/* 더보기 */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, paddingTop: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: moreOpen ? '#1d4ed8' : '#9ca3af',
            borderTop: moreOpen ? '2px solid #1d4ed8' : '2px solid transparent',
          }}
        >
          <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.5 : 2} />
          <span style={{ fontSize: 10, fontWeight: moreOpen ? 700 : 500 }}>더보기</span>
        </button>
      </nav>
    </>
  );
}
