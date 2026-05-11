'use client';

import { useEffect } from 'react';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
}

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

export default function AdUnit({ slotId, format = 'auto', style }: AdUnitProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', ...style }}>
      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 6, letterSpacing: '0.05em' }}>광고</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6751517797498225"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
