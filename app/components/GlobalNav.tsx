'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  ClipboardList, Calendar, BarChart2, Calculator,
  Tag, Building2, Map, BookOpen, Star, Mail, Menu, X, Search, ChevronDown,
} from 'lucide-react';
import ShareButton from './ShareButton';
import InstallButton from './InstallButton';
import KakaoChannelButton from './KakaoChannelButton';

// 주요 메뉴 — 항상 표시
const PRIMARY_NAV = [
  { href: '/',           label: '청약정보',       icon: ClipboardList, exact: true },
  { href: '/unsold',     label: '미분양정보',      icon: Tag },
  { href: '/map',        label: '지도',           icon: Map },
  { href: '/trade',      label: '실거래가 분석',   icon: BarChart2 },
  { href: '/calculator', label: '계산기',         icon: Calculator },
];

// 더보기 드롭다운
const MORE_NAV = [
  { href: '/complex',    label: '단지정보',  icon: Search },
  { href: '/calendar',   label: '청약달력',  icon: Calendar },
  { href: '/rental',     label: '임대정보',  icon: Building2 },
  { href: '/region/서울', label: '지역별',   icon: Map, matchPrefix: '/region' },
  { href: '/apt',        label: '부동산정보', icon: BookOpen },
  { href: '/favorites',  label: '관심단지',  icon: Star },
  { href: '/contact',    label: '문의',      icon: Mail },
];

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

export default function GlobalNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen]     = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  function isActive(item: { href: string; exact?: boolean; matchPrefix?: string }) {
    if (item.exact) return pathname === '/';
    const prefix = item.matchPrefix ?? item.href;
    return pathname.startsWith(prefix);
  }

  const moreActive = MORE_NAV.some(item => isActive(item));

  // 외부 클릭 시 더보기 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  return (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <style>{`
        .gnav-pc { display: flex; }
        .gnav-mb { display: none; }
        @media (max-width: 899px) {
          .gnav-pc { display: none !important; }
          .gnav-mb { display: flex !important; }
        }
      `}</style>

      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 16px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* 로고 */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
            borderRadius: 12, width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 11h2v9a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1v-9h2L12 3z" fill="white"/>
              <rect x="9.5" y="14.5" width="5" height="5.5" rx="0.8" fill="#f97316" opacity="0.75"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.12em' }}>DANJI JIPSA</span>
            <span style={{ marginTop: 3, fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span style={{ color: '#1e293b' }}>단지</span>
              <span style={{ color: '#ec4899' }}>집사</span>
            </span>
          </div>
        </Link>

        {/* 데스크톱 메뉴 */}
        <nav className="gnav-pc" style={{ alignItems: 'center', gap: 1, flex: 1, justifyContent: 'center', margin: '0 8px' }}>

          {/* 주요 메뉴 */}
          {PRIMARY_NAV.map(item => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 9px', borderRadius: 7,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                whiteSpace: 'nowrap',
                color: active ? '#1d4ed8' : '#4b5563',
                background: active ? '#eff6ff' : 'transparent',
              }}>
                <Icon size={13} strokeWidth={2.2} />
                {item.label}
              </Link>
            );
          })}

          {/* 더보기 드롭다운 */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '6px 9px', borderRadius: 7,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: 'none', whiteSpace: 'nowrap',
                color: moreActive ? '#1d4ed8' : '#4b5563',
                background: moreOpen || moreActive ? '#eff6ff' : 'transparent',
              }}
            >
              더보기
              <ChevronDown size={12} style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {moreOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                padding: '6px', minWidth: 160, zIndex: 200,
              }}>
                {MORE_NAV.map(item => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, textDecoration: 'none',
                        color: active ? '#1d4ed8' : '#374151',
                        background: active ? '#eff6ff' : 'transparent',
                      }}
                    >
                      <Icon size={14} strokeWidth={2} color={active ? '#1d4ed8' : '#9ca3af'} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* 우측 버튼 */}
        <div className="gnav-pc" style={{ alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <KakaoChannelButton size="sm" label="카카오" />
          <ShareButton />
          <InstallButton />
        </div>

        {/* 모바일 햄버거 */}
        <button
          className="gnav-mb"
          onClick={() => setMobileOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 11, color: '#374151', alignItems: 'center', justifyContent: 'center' }}
          aria-label="메뉴"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.3)' }} />
      )}

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderTop: '1px solid #e5e7eb', background: '#fff',
          padding: '4px 12px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          position: 'relative', zIndex: 100,
        }}>
          {ALL_NAV.map(item => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 10px', fontSize: 14, fontWeight: 600,
                  textDecoration: 'none', borderBottom: '1px solid #f3f4f6',
                  color: active ? '#1d4ed8' : '#374151',
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
      )}
    </header>
  );
}
