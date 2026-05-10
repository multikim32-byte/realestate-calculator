'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>일시적인 오류가 발생했습니다</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
          잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침 해주세요.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            다시 시도
          </button>
          <Link
            href="/"
            style={{ padding: '10px 24px', borderRadius: 8, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
