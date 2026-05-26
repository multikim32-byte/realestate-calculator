'use client';

export default function UnsoldError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
      <p style={{ fontSize: 14, color: '#6b7280' }}>페이지를 불러오는 중 오류가 발생했습니다.</p>
      <pre style={{ fontSize: 11, color: '#ef4444', background: '#fef2f2', padding: 12, borderRadius: 8, maxWidth: 600, overflow: 'auto' }}>
        {error.message}
        {error.digest ? `\ndigest: ${error.digest}` : ''}
      </pre>
      <button onClick={reset} style={{ fontSize: 13, padding: '8px 20px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', cursor: 'pointer' }}>
        다시 시도
      </button>
    </div>
  );
}
