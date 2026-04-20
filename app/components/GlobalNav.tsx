'use client';

import Link from 'next/link';
import ShareButton from './ShareButton';
import InstallButton from './InstallButton';

export default function GlobalNav() {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Link href="/" style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>📋 청약정보</Link>
        <Link href="/calendar" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>📅 청약달력</Link>
        <Link href="/trade" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>📊 실거래가</Link>
        <Link href="/calculator" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>🏠 계산기</Link>
        <Link href="/unsold" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>🏷️ 분양정보</Link>
        <Link href="/rental" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>🏘 임대정보</Link>
        <Link href="/region/서울" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>🗺 지역별</Link>
        <Link href="/apt" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>📰 부동산정보</Link>
        <Link href="/favorites" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>⭐ 관심단지</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 600 }}>📬 문의</Link>
        <ShareButton />
        <InstallButton />
      </div>
    </div>
  );
}
