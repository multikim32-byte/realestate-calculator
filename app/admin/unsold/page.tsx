'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UnsoldListing } from '@/lib/supabase';
import DeleteModal from '../components/DeleteModal';

const PAGE_SIZE = 20;

function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };
  return { toast, show };
}

type SortKey = 'created_at' | 'name' | 'location';

export default function AdminUnsoldListPage() {
  const [listings, setListings] = useState<UnsoldListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sido, setSido] = useState('전체');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<UnsoldListing | null>(null);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const router = useRouter();
  const { toast, show } = useToast();

  const sidoList = useMemo(() => {
    const set = new Set(listings.map(l => l.location.trim().split(/\s+/)[0]).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [listings]);

  const filtered = useMemo(() => {
    const base = listings.filter(l => {
      if (sido !== '전체' && l.location.trim().split(/\s+/)[0] !== sido) return false;
      if (search && !l.name.includes(search) && !l.location.includes(search)) return false;
      return true;
    });
    return [...base].sort((a, b) => {
      let v = 0;
      if (sortKey === 'created_at') v = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === 'name') v = a.name.localeCompare(b.name, 'ko');
      else if (sortKey === 'location') v = a.location.localeCompare(b.location, 'ko');
      return sortAsc ? v : -v;
    });
  }, [listings, sido, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/unsold');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      if (!cancelled) { setListings(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/unsold/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { setListings(prev => prev.filter(l => l.id !== deleteTarget.id)); show('삭제됐습니다.'); }
    else show('삭제 실패', false);
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await Promise.all(ids.map(id => fetch(`/api/admin/unsold/${id}`, { method: 'DELETE' })));
    setListings(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    setBulkDeleteModal(false);
    show(`${ids.length}건 삭제됐습니다.`);
  };

  const handleBulkToggle = async (active: boolean) => {
    const ids = [...selected];
    await Promise.all(ids.map(id => fetch(`/api/admin/unsold/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: active }),
    })));
    setListings(prev => prev.map(l => selected.has(l.id) ? { ...l, is_active: active } : l));
    setSelected(new Set());
    show(`${ids.length}건 ${active ? '활성화' : '비활성화'}됐습니다.`);
  };

  const handleToggleActive = async (item: UnsoldListing) => {
    const res = await fetch(`/api/admin/unsold/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (res.ok) setListings(prev => prev.map(l => l.id === item.id ? { ...l, is_active: !l.is_active } : l));
  };

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allPageSelected = paged.length > 0 && paged.every(l => selected.has(l.id));
  const togglePageAll = () => {
    if (allPageSelected) setSelected(prev => { const n = new Set(prev); paged.forEach(l => n.delete(l.id)); return n; });
    else setSelected(prev => { const n = new Set(prev); paged.forEach(l => n.add(l.id)); return n; });
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sortKey === k ? '#1d4ed8' : '#374151', fontWeight: sortKey === k ? 700 : 400, padding: '4px 6px', borderRadius: 6 }}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, fontWeight: 700, background: toast.ok ? '#dcfce7' : '#fef2f2', color: toast.ok ? '#166534' : '#dc2626', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14 }}>{toast.msg}</div>}
      {deleteTarget && <DeleteModal title={`"${deleteTarget.name}" 삭제`} description="삭제하면 복구할 수 없습니다." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {bulkDeleteModal && <DeleteModal title={`선택한 ${selected.size}건 삭제`} description="삭제하면 복구할 수 없습니다." onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteModal(false)} />}

      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>미분양 매물</span>
          <Link href="/admin/sale-content" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>청약 콘텐츠</Link>
          <Link href="/admin/unsold/leads" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>리드 관리</Link>
        </div>
        <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.push('/admin'); }} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>미분양 매물 관리</h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>총 {listings.length}건 · 검색결과 {filtered.length}건</p>
          </div>
          <Link href="/admin/unsold/new" style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            + 매물 등록
          </Link>
        </div>

        {/* 검색/필터 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="단지명 검색"
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, width: 180 }} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>정렬:</span>
              <SortBtn k="created_at" label="등록일" />
              <SortBtn k="name" label="단지명" />
              <SortBtn k="location" label="지역" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sidoList.map(s => (
              <button key={s} onClick={() => { setSido(s); setPage(1); }}
                style={{ padding: '7px 14px', borderRadius: 20, border: 'none', fontSize: 13, cursor: 'pointer', background: sido === s ? '#1d4ed8' : '#f1f5f9', color: sido === s ? '#fff' : '#374151', fontWeight: sido === s ? 700 : 400 }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 다중 선택 액션 바 */}
        {selected.size > 0 && (
          <div style={{ background: '#1d4ed8', borderRadius: 10, padding: '12px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{selected.size}건 선택됨</span>
            <button onClick={() => handleBulkToggle(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>활성화</button>
            <button onClick={() => handleBulkToggle(false)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#fef3c7', color: '#92400e', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>비활성화</button>
            <button onClick={() => setBulkDeleteModal(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>삭제</button>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>선택 해제</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>불러오는 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 전체 선택 헤더 */}
            {paged.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <input type="checkbox" checked={allPageSelected} onChange={togglePageAll} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: 12, color: '#6b7280' }}>이 페이지 전체 선택 ({paged.length}건)</span>
              </div>
            )}

            {paged.map(item => (
              <div key={item.id} style={{
                background: selected.has(item.id) ? '#eff6ff' : '#fff', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${selected.has(item.id) ? '#93c5fd' : item.is_active ? '#e5e7eb' : '#fca5a5'}`,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              } as React.CSSProperties}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ width: 60, height: 60, borderRadius: 8, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                  {item.thumbnail_url
                    ? <Image src={item.thumbnail_url} alt={item.name} width={60} height={60} style={{ objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 24 }}>🏢</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8 }}>{item.category}</span>
                    {item.highlight && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 8 }}>⭐ 주목</span>}
                    {!item.is_active && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 8 }}>비활성</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{item.location}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>등록일: {item.created_at.slice(0, 10)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleToggleActive(item)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, cursor: 'pointer', color: item.is_active ? '#dc2626' : '#059669' }}>
                    {item.is_active ? '비활성' : '활성화'}
                  </button>
                  <Link href={`/admin/unsold/${item.id}/edit`}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, textDecoration: 'none', color: '#374151' }}>수정</Link>
                  <button onClick={() => setDeleteTarget(item)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>삭제</button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                <p style={{ margin: 0 }}>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#d1d5db' : '#374151' }}>‹ 이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map((p, i, arr) => (
              <span key={p}>
                {i > 0 && arr[i-1] !== p - 1 && <span style={{ color: '#9ca3af', padding: '0 4px' }}>…</span>}
                <button onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: page === p ? '#1d4ed8' : '#fff', color: page === p ? '#fff' : '#374151', fontSize: 13, fontWeight: page === p ? 700 : 400, cursor: 'pointer' }}>{p}</button>
              </span>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? '#d1d5db' : '#374151' }}>다음 ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
