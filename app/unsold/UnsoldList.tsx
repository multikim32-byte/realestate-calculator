'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';

function fmt만원(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

export default function UnsoldList({ listings }: { listings: UnsoldListing[] }) {
  const [category, setCategory] = useState('전체');
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const filtered = category === '전체'
    ? listings
    : listings.filter(l => l.category === category);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            style={{
              padding: '8px 18px', borderRadius: 24, border: 'none', fontSize: 14,
              fontWeight: category === cat ? 700 : 400,
              background: category === cat ? '#1d4ed8' : '#fff',
              color: category === cat ? '#fff' : '#374151',
              cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
          총 {filtered.length}건
        </span>
      </div>

      {/* 빈 상태 */}
      {paged.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>등록된 매물이 없습니다.</p>
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {paged.map(item => (
          <Link key={item.id} href={`/unsold/${item.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#fff', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: item.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
              }}
            >
              {/* 썸네일 */}
              <div style={{ width: '100%', height: 200, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🏢</div>
                )}
                {item.highlight && (
                  <div style={{ position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                    ⭐ 주목 단지
                  </div>
                )}
                <div style={{ position: 'absolute', top: 10, right: 10, background: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                  {item.category}
                </div>
              </div>

              {/* 정보 */}
              <div style={{ padding: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 4px', lineHeight: 1.4 }}>{item.name}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>📍 {item.location}</p>
                {(item.min_price || item.max_price) && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginBottom: 6 }}>
                    {item.min_price && item.max_price
                      ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                      : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                  {item.remaining_units != null && (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      잔여 {item.remaining_units}세대
                    </span>
                  )}
                  {item.area && (
                    <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: 8 }}>
                      {item.area}
                    </span>
                  )}
                </div>
                {item.benefit && (
                  <p style={{ fontSize: 12, color: '#059669', marginTop: 8, fontWeight: 600 }}>🎁 {item.benefit}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9ca3af' : '#374151' }}>
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: page === p ? '#1d4ed8' : '#fff', color: page === p ? '#fff' : '#374151', fontWeight: page === p ? 700 : 400, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#9ca3af' : '#374151' }}>
            다음
          </button>
        </div>
      )}
    </>
  );
}
