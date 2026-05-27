'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function MapError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[지도] 오류:', error); }, [error]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100dvh - 56px)', padding: 24, textAlign: 'center', background: '#f8fafc',
    }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🗺️</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>
        지도를 불러오지 못했습니다
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.7, maxWidth: 320 }}>
        카카오 지도 서비스에 일시적인 오류가 발생했습니다.<br />
        잠시 후 다시 시도해 주세요.
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 28px' }}>
        {error?.message || '알 수 없는 오류'}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#1d4ed8', color: '#fff', fontSize: 14, fontWeight: 700,
          }}
        >
          다시 시도
        </button>
        <Link
          href="/"
          style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid #e5e7eb',
            color: '#374151', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            background: '#fff',
          }}
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
