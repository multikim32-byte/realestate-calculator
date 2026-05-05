'use client';

import { useEffect, useState } from 'react';
import { X, Star, Smartphone } from 'lucide-react';

type DeviceType = 'android' | 'ios' | 'pc';

function getDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'pc';
}

const STORAGE_KEY = 'mk_bookmark_toast_dismissed';
const DELAY_MS = 15000; // 15초 후 표시

export default function BookmarkToast() {
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<DeviceType>('pc');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // 이미 닫은 적 있으면 표시 안 함
    if (localStorage.getItem(STORAGE_KEY)) return;

    const d = getDevice();
    setDevice(d);

    // Android: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setVisible(true), DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  async function handleAndroidInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes mk-slide-up {
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .mk-toast {
          animation: mk-slide-up 0.35s ease;
        }
      `}</style>

      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: 'min(360px, calc(100vw - 32px))',
      }}>
      <div className="mk-toast" style={{
        background: '#1e3a5f', borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        padding: '18px 20px',
        color: '#fff',
      }}>
        {/* 닫기 */}
        <button onClick={dismiss} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20,
          width: 26, height: 26, cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} />
        </button>

        {/* 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Star size={18} fill="#fbbf24" color="#fbbf24" />
          <span style={{ fontSize: 15, fontWeight: 700 }}>즐겨찾기에 추가하세요</span>
        </div>

        {/* 디바이스별 안내 */}
        {device === 'pc' && (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: '0 0 14px' }}>
              매일 청약·분양 정보를 빠르게 확인하세요.<br />
              즐겨찾기 추가하면 바로 접속할 수 있습니다.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, color: '#bfdbfe',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <kbd style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 4,
                padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: '#fff',
              }}>Ctrl</kbd>
              <span>+</span>
              <kbd style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 4,
                padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: '#fff',
              }}>D</kbd>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>를 누르면 즐겨찾기 추가됩니다</span>
            </div>
            <button onClick={dismiss} style={{
              width: '100%', background: '#2563eb', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 0', cursor: 'pointer',
            }}>확인</button>
          </>
        )}

        {device === 'android' && (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: '0 0 14px' }}>
              홈 화면에 추가하면 앱처럼 빠르게 접속할 수 있습니다.
            </p>
            <button onClick={handleAndroidInstall} style={{
              width: '100%', background: '#2563eb', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 0', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Smartphone size={16} />
              홈 화면에 추가
            </button>
            <button onClick={dismiss} style={{
              width: '100%', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '10px 0',
              cursor: 'pointer', marginTop: 4,
            }}>괜찮아요</button>
          </>
        )}

        {device === 'ios' && (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: '0 0 12px' }}>
              홈 화면에 추가하면 앱처럼 빠르게 접속할 수 있습니다.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '12px 14px', fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)',
              marginBottom: 14,
            }}>
              <div>1. 하단 <strong style={{ color: '#fff' }}>공유 버튼</strong> 탭 (사각형 + 화살표)</div>
              <div>2. <strong style={{ color: '#fff' }}>홈 화면에 추가</strong> 선택</div>
              <div>3. <strong style={{ color: '#fff' }}>추가</strong> 탭</div>
            </div>
            <button onClick={dismiss} style={{
              width: '100%', background: '#2563eb', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 0', cursor: 'pointer',
            }}>확인</button>
          </>
        )}
      </div>
      </div>
    </>
  );
}
