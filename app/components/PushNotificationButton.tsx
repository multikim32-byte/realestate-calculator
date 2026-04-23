'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

const PUSH_KEY = 'mk_push_subscribed'; // ["sale:id1", "sale:id2"]

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

interface Props {
  item: {
    id: string;
    type: 'sale' | 'unsold';
    name: string;
    location: string;
    receiptStart?: string;
  };
}

export default function PushNotificationButton({ item }: Props) {
  const [state, setState] = useState<'idle' | 'on' | 'loading' | 'hidden'>('hidden');
  const itemKey = `${item.type}:${item.id}`;

  useEffect(() => {
    // 푸시 미지원 브라우저 또는 receiptStart 없으면 숨김
    if (!('Notification' in window) || !('PushManager' in window) || !item.receiptStart) return;

    // 이미 지난 청약은 숨김
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(item.receiptStart) < today) return;

    const stored: string[] = JSON.parse(localStorage.getItem(PUSH_KEY) || '[]');
    setState(stored.includes(itemKey) ? 'on' : 'idle');
  }, [itemKey, item.receiptStart]);

  if (state === 'hidden') return null;

  async function toggle() {
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('idle'); return; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });
      }

      const isOn = state === 'on';
      await fetch('/api/push/subscribe', {
        method: isOn ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isOn
            ? { subscription: sub.toJSON(), itemId: item.id }
            : { subscription: sub.toJSON(), item: { id: item.id, name: item.name, receiptStart: item.receiptStart, location: item.location } }
        ),
      });

      const stored: string[] = JSON.parse(localStorage.getItem(PUSH_KEY) || '[]');
      const next = isOn ? stored.filter(k => k !== itemKey) : [...stored, itemKey];
      localStorage.setItem(PUSH_KEY, JSON.stringify(next));
      setState(isOn ? 'idle' : 'on');
    } catch {
      setState(state === 'on' ? 'on' : 'idle');
    }
  }

  const isOn = state === 'on';

  return (
    <button
      onClick={toggle}
      disabled={state === 'loading'}
      title={isOn ? '알림 취소' : `청약 시작 전날 알림 받기 (${item.receiptStart})`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 12px',
        background: isOn ? '#eff6ff' : '#f9fafb',
        color: isOn ? '#1d4ed8' : '#6b7280',
        border: `1px solid ${isOn ? '#bfdbfe' : '#e5e7eb'}`,
        borderRadius: 8, fontSize: 12, fontWeight: 600,
        cursor: state === 'loading' ? 'default' : 'pointer',
        flexShrink: 0,
      }}
    >
      {isOn
        ? <Bell size={12} strokeWidth={2.2} />
        : <BellOff size={12} strokeWidth={2.2} />
      }
      {state === 'loading' ? '...' : isOn ? '알림 ON' : '알림'}
    </button>
  );
}
