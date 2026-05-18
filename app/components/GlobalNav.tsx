'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ClipboardList, Calendar, BarChart2, Calculator,
  Tag, Building2, Map, BookOpen, Star, Mail, Menu, X,
} from 'lucide-react';
import ShareButton from './ShareButton';
import InstallButton from './InstallButton';
import KakaoChannelButton from './KakaoChannelButton';

const NAV_ITEMS = [
  { href: '/',           label: '청약정보',  icon: ClipboardList, exact: true },
  { href: '/unsold',     label: '미분양정보', icon: Tag },
  { href: '/calendar',   label: '청약달력',  icon: Calendar },
  { href: '/trade',      label: '실거래가',  icon: BarChart2 },
  { href: '/map',        label: '지도',      icon: Map },
  { href: '/calculator', label: '계산기',    icon: Calculator },
  { href: '/rental',     label: '임대정보',  icon: Building2 },
  { href: '/region/서울', label: '지역별',   icon: Map, matchPrefix: '/region' },
  { href: '/apt',        label: '부동산정보', icon: BookOpen },
  { href: '/favorites',  label: '관심단지',  icon: Star },
  { href: '/contact',    label: '문의',      icon: Mail },
];

export default function GlobalNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === '/';
    const prefix = item.matchPrefix ?? item.href;
    return pathname.startsWith(prefix);
  }

  return (
    <>
      <style>{`
        .gnav-desktop { display: flex; }
        .gnav-hamburger { display: none !important; }
        .gnav-mobile { display: none; }
        @media (max-width: 768px) {
          .gnav-desktop { display: none !important; }
          .gnav-hamburger { display: flex !important; }
          .gnav-mobile.open { display: flex; }
        }
      `}</style>

      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* 메인 바 */}
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 16px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* 로고 */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: '#1d4ed8', borderRadius: 8,
              width: 36, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, gap: 1,
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '-1px' }}>AZ</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f', letterSpacing: '-0.3px' }}>
              아파트집사
            </span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <nav className="gnav-desktop" style={{ alignItems: 'center', gap: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '5px 7px', borderRadius: 7,
                    fontSize: 12, fontWeight: 600, textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    color: active ? '#1d4ed8' : '#4b5563',
                    background: active ? '#eff6ff' : 'transparent',
                  }}
                >
                  <Icon size={12} strokeWidth={2.2} />
                  {item.label}
                </Link>
              );
            })}

            <div style={{
              display: 'flex', gap: 5, marginLeft: 6, alignItems: 'center',
              paddingLeft: 10, borderLeft: '1px solid #e5e7eb', flexShrink: 0,
            }}>
              <KakaoChannelButton size="sm" label="카카오" />
              <ShareButton />
              <InstallButton />
            </div>
          </nav>

          {/* 모바일 햄버거 */}
          <button
            className="gnav-hamburger"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, color: '#374151',
              alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="메뉴"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* 모바일 드롭다운 */}
        <div
          className={`gnav-mobile${mobileOpen ? ' open' : ''}`}
          style={{
            flexDirection: 'column',
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
            padding: '4px 12px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 10px',
                  fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  color: active ? '#1d4ed8' : '#374151',
                  borderBottom: '1px solid #f3f4f6',
                  background: active ? '#eff6ff' : 'transparent',
                  borderRadius: 8,
                }}
              >
                <Icon size={16} strokeWidth={2} color={active ? '#1d4ed8' : '#9ca3af'} />
                {item.label}
              </Link>
            );
          })}

          <div style={{ display: 'flex', gap: 8, padding: '12px 10px 0', flexWrap: 'wrap' }}>
            <KakaoChannelButton size="sm" />
            <ShareButton />
            <InstallButton />
          </div>
        </div>
      </header>
    </>
  );
}
