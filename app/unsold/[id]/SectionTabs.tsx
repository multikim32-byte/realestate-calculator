'use client';

import { useState } from 'react';
import type { UnsoldSection } from '@/lib/supabase';

export default function SectionTabs({ sections }: { sections: UnsoldSection[] }) {
  const activeSections = sections.filter(s => s.images.length > 0);
  const [active, setActive] = useState(activeSections[0]?.name ?? '');

  if (activeSections.length === 0) return null;

  const current = activeSections.find(s => s.name === active);

  return (
    <div style={{ marginTop: 32 }}>
      {/* 탭 헤더 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        {activeSections.map(s => (
          <button
            key={s.name}
            onClick={() => setActive(s.name)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              fontWeight: active === s.name ? 800 : 500,
              color: active === s.name ? '#1d4ed8' : '#6b7280',
              borderBottom: active === s.name ? '2px solid #1d4ed8' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {current && (
        <div style={{ paddingTop: 24 }}>
          {current.images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${current.name} ${i + 1}`}
              loading="lazy"
              decoding="async"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8, marginBottom: 8 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
