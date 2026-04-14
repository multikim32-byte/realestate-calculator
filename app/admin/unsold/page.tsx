'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UnsoldListing } from '@/lib/supabase';

export default function AdminUnsoldListPage() {
  const [listings, setListings] = useState<UnsoldListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sido, setSido] = useState('전체');
  const [search, setSearch] = useState('');
  const router = useRouter();

  const sidoList = useMemo(() => {
    const set = new Set(listings.map(l => l.location.trim().split(/\s+/)[0]).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [listings]);

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (sido !== '전체' && l.location.trim().split(/\s+/)[0] !== sido) return false;
      if (search && !l.name.includes(search) && !l.location.includes(search)) return false;
      return true;
    });
  }, [listings, sido, search]);

  async function load() {
    const res = await fetch('/api/admin/unsold');
    if (res.status === 401) { router.push('/admin'); return; }
    const data = await res.json();
    setListings(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}"을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/unsold/${id}`, { method: 'DELETE' });
    if (res.ok) setListings(prev => prev.filter(l => l.id !== id));
    else alert('삭제 실패');
  };

  const handleToggleActive = async (item: UnsoldListing) => {
    const res = await fetch(`/api/admin/unsold/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (res.ok) setListings(prev => prev.map(l => l.id === item.id ? { ...l, is_active: !l.is_active } : l));
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🏠 관리자</span>
          <Link href="/unsold" target="_blank" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>사이트 보기 →</Link>
        </div>
        <button onClick={handleLogout} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>미분양 매물 관리</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>총 {listings.length}건 · 검색결과 {filtered.length}건</p>
          </div>
          <Link href="/admin/unsold/new"
            style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            + 매물 등록
          </Link>
        </div>

        {/* 검색/필터 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="단지명 검색"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 200 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sidoList.map(s => (
              <button key={s} onClick={() => setSido(s)}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: 'none', fontSize: 13, cursor: 'pointer',
                  background: sido === s ? '#1d4ed8' : '#f1f5f9',
                  color: sido === s ? '#fff' : '#374151',
                  fontWeight: sido === s ? 700 : 400,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => (
              <div key={item.id} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${item.is_active ? '#e5e7eb' : '#fca5a5'}`,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                {/* 썸네일 */}
                <div style={{ width: 60, height: 60, borderRadius: 8, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                  {item.thumbnail_url
                    ? <img src={item.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 24 }}>🏢</div>
                  }
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8 }}>{item.category}</span>
                    {item.highlight && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 8 }}>⭐ 주목</span>}
                    {!item.is_active && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 8 }}>비활성</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{item.location}</div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleToggleActive(item)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer', color: item.is_active ? '#dc2626' : '#059669' }}>
                    {item.is_active ? '비활성' : '활성화'}
                  </button>
                  <Link href={`/admin/unsold/${item.id}/edit`}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, textDecoration: 'none', color: '#374151' }}>
                    수정
                  </Link>
                  <button onClick={() => handleDelete(item.id, item.name)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
