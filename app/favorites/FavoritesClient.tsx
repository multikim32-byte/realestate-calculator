'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GlobalNav from '@/app/components/GlobalNav';
import type { Favorite } from '@/lib/useFavorites';

const FAV_KEY = 'mk_favorites';

export default function FavoritesClient() {
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      setFavs(data.sort((a: Favorite, b: Favorite) => b.savedAt.localeCompare(a.savedAt)));
    } catch {}
    setMounted(true);
  }, []);

  function remove(id: string, type: string) {
    const next = favs.filter(f => !(f.id === id && f.type === type));
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  }

  const sales = favs.filter(f => f.type === 'sale');
  const unsolds = favs.filter(f => f.type === 'unsold');

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <GlobalNav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>⭐ 관심 단지</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            ☆ 버튼으로 저장한 단지들이 여기에 모입니다. 브라우저에 저장되므로 로그인 없이 이용 가능합니다.
          </p>
        </div>

        {!mounted ? null : favs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>☆</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>저장된 관심 단지가 없습니다</p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>청약정보나 분양정보의 ☆ 버튼을 눌러 저장해보세요.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>청약정보 보기</Link>
              <Link href="/unsold" style={{ padding: '10px 20px', background: '#059669', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>분양정보 보기</Link>
            </div>
          </div>
        ) : (
          <>
            {sales.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>📋 관심 청약정보 ({sales.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sales.map(f => (
                    <div key={f.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/sale/${f.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{f.name}</p>
                          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>📍 {f.location}</p>
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Link href={`/sale/${f.id}`} style={{ padding: '6px 14px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>보기</Link>
                        <button onClick={() => remove(f.id, f.type)} style={{ padding: '6px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {unsolds.length > 0 && (
              <section>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>🏷️ 관심 분양정보 ({unsolds.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {unsolds.map(f => (
                    <div key={f.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/unsold/${f.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{f.name}</p>
                          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>📍 {f.location}</p>
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Link href={`/unsold/${f.id}`} style={{ padding: '6px 14px', background: '#f0fdf4', color: '#059669', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>보기</Link>
                        <button onClick={() => remove(f.id, f.type)} style={{ padding: '6px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
