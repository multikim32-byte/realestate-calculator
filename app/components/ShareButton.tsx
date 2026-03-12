'use client';

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
      style={{ fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
    >
      🔗 공유
    </button>
  );
}
