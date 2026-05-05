'use client';

import { Share2 } from 'lucide-react';

export default function ShareButton({ large }: { large?: boolean }) {
  function handleShare() {
    if (typeof navigator === 'undefined') return;
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert('링크가 복사되었습니다.'));
    }
  }

  if (large) {
    return (
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={handleShare}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 12, cursor: 'pointer',
            background: '#fff', border: '1px solid #e5e7eb',
            fontSize: 15, fontWeight: 700, color: '#374151',
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          }}
        >
          <Share2 size={18} strokeWidth={2} />
          이 매물 공유하기
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 13, color: '#4b5563', background: 'none',
        border: 'none', cursor: 'pointer', fontWeight: 600,
        padding: '6px 9px', borderRadius: 8,
      }}
    >
      <Share2 size={13} strokeWidth={2.2} />
      공유
    </button>
  );
}
