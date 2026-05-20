'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  { href: '/calendar',    label: '청약달력',  icon: Calendar },
  { href: '/calculator',  label: '계산기',    icon: Calculator },
  { href: '/rental',      label: '임대정보',  icon: Building2 },
  { href: '/region/서울', label: '지역별',    icon: Map },
  { href: '/apt',         label: '부동산정보', icon: BookOpen },
  { href: '/favorites',   label: '관심단지',  icon: Star },
  { href: '/contact',     label: '문의',      icon: Mail },
];

const NAV_BG   = '#1e3a5f';   // 다크 네이비
const ACTIVE   = '#fff';      // 활성 아이콘/텍스트
const INACTIVE = 'rgba(255,255,255,0.5)'; // 비활성

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (pathname.startsWith('/admin')) return null;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === '/';
    return pathname.startsWith(href);
  }

  const closeMore = () => setMoreOpen(false);

  return (
    <>
      <style>{`
        .bnav { display: flex; }
        @media (min-width: 900px) { .bnav { display: none !important; } }
      `}</style>

      {/* 오버레이 */}
      {moreOpen && (
        <div
          onClick={closeMore}
          style={{ position: 'fixed', inset: 0, zIndex: 298, background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* 더보기 슬라이드업 패널 */}
      <div
        className="bnav"
        style={{
          position: 'fixed', left: 0, right: 0,
          bottom: 'calc(60px + env(safe-area-inset-bottom))',
          zIndex: 299,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          transform: moreOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          padding: '20px 16px 24px',
          pointerEvents: moreOpen ? 'auto' : 'none',
          flexDirection: 'column',
        }}
      >
        {/* 핸들 바 */}
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '-8px auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>더보기</span>
          <button
            onClick={closeMore}
            style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMore}
                style={{
                  textDecoration: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 8px', borderRadius: 14,
                  background: active ? '#eff6ff' : '#f8fafc',
                  border: active ? '1.5px solid #bfdbfe' : '1.5px solid transparent',
                }}
              >
                <Icon size={22} color={active ? '#1d4ed8' : '#6b7280'} strokeWidth={2} />
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#1d4ed8' : '#374151' }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 탭바 — 다크 네이비 배경 */}
      <nav
        className="bnav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: NAV_BG,
          boxShadow: '0 -4px 20px rgba(30,58,95,0.35)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 'calc(60px + env(safe-area-inset-bottom))',
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
                gap: 4, textDecoration: 'none',
                color: active ? ACTIVE : INACTIVE,
                position: 'relative',
              }}
            >
              {/* 활성 탭 pill 배경 */}
              {active && (
                <div style={{
                  position: 'absolute', top: 6, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 44, height: 30, borderRadius: 15,
                  background: 'rgba(255,255,255,0.15)',
                }} />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} style={{ position: 'relative' }} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, position: 'relative' }}>{label}</span>
            </Link>
          );
        })}

        {/* 더보기 */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4, background: 'none', border: 'none', cursor: 'pointer',
            color: moreOpen ? ACTIVE : INACTIVE,
            position: 'relative',
          }}
        >
          {moreOpen && (
            <div style={{
              position: 'absolute', top: 6, left: '50%',
              transform: 'translateX(-50%)',
              width: 44, height: 30, borderRadius: 15,
              background: 'rgba(255,255,255,0.15)',
            }} />
          )}
          <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.5 : 1.8} style={{ position: 'relative' }} />
          <span style={{ fontSize: 10, fontWeight: moreOpen ? 700 : 400, position: 'relative' }}>더보기</span>
        </button>
      </nav>
    </>
  );
}
