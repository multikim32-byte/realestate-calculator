'use client';

import { Share2 } from 'lucide-react';

export default function ShareButton() {
  function handleShare() {
    if (typeof navigator === 'undefined') return;
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert('링크가 복사되었습니다.'));
    }
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
