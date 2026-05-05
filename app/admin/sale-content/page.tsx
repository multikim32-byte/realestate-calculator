'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SaleContent } from '@/lib/saleContent';

export default function SaleContentListPage() {
  const [list, setList] = useState<SaleContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (houseManageNo: string) => {
    if (!confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    setDeleting(houseManageNo);
    const res = await fetch(`/api/admin/sale-content/${houseManageNo}`, { method: 'DELETE' });
    if (res.ok) setList(prev => prev.filter(c => c.house_manage_no !== houseManageNo));
    else alert('삭제 실패');
    setDeleting(null);
  };

  useEffect(() => {
    fetch('/api/admin/sale-content')
      .then(r => { if (r.status === 401) router.push('/admin'); return r.json(); })
      .then(data => { setList(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (keyword.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('/api/sale?type=all&perPage=100');
        const data = await res.json();
        const kw = keyword.trim();
        const filtered = (data.items ?? []).filter((item: any) =>
          item.name.includes(kw) || item.location?.includes(kw)
        );
        setSearchResults(filtered.slice(0, 10));
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const existingIds = new Set(list.map(c => c.house_manage_no));

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <Link href="/admin/unsold" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>미분양 매물</Link>
          <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>청약 콘텐츠</span>
        </div>
        <Link href="/api/admin/logout" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>로그아웃</Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>청약 에디토리얼 콘텐츠</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>
          청약홈 API 페이지에 커스텀 설명·이미지를 추가해 SEO를 강화합니다.
        </p>

        {/* 청약 공고 검색 */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
            청약 공고 검색 후 콘텐츠 작성
          </p>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="단지명 또는 지역 검색 (2자 이상)"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 14,
                border: '1.5px solid #d1d5db', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {searching && (
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9ca3af' }}>
                검색 중...
              </span>
            )}
          </div>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              {searchResults.map((item: any, i: number) => {
                const hasContent = existingIds.has(item.houseManageNo);
                return (
                  <div key={item.houseManageNo ?? i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: '#fff',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                        {hasContent && (
                          <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                            콘텐츠 있음
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {item.buildingType} · {item.location} · {item.totalUnits?.toLocaleString()}세대
                        {item.status && ` · ${item.status}`}
                      </div>
                    </div>
                    <Link
                      href={`/admin/sale-content/${item.houseManageNo}`}
                      style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        background: hasContent ? '#f3f4f6' : '#1d4ed8',
                        color: hasContent ? '#374151' : '#fff',
                        textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {hasContent ? '수정' : '작성'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {keyword.length >= 2 && !searching && searchResults.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '10px 0 0' }}>검색 결과가 없습니다.</p>
          )}
        </div>

        {/* 작성된 콘텐츠 목록 */}
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
          작성된 콘텐츠 {loading ? '...' : `${list.length}건`}
        </p>

        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ margin: 0 }}>위 검색으로 청약 공고를 찾아 첫 콘텐츠를 작성해보세요.</p>
          </div>
        )}

        {list.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(item => (
              <div key={item.id} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
              }}>
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt=""
                    style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e5e7eb' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: item.is_published ? '#d1fae5' : '#f3f4f6',
                      color: item.is_published ? '#065f46' : '#6b7280',
                    }}>
                      {item.is_published ? '공개' : '비공개'}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.house_manage_no}</span>
                  </div>
                  {item.summary && (
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.summary}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                    수정: {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    {item.pros?.length ? ` · 장점 ${item.pros.length}개` : ''}
                    {item.image_urls?.length ? ` · 이미지 ${item.image_urls.length}장` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/sale/${item.house_manage_no}`}
                    target="_blank"
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
                  >
                    미리보기
                  </Link>
                  <Link
                    href={`/admin/sale-content/${item.house_manage_no}`}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => handleDelete(item.house_manage_no)}
                    disabled={deleting === item.house_manage_no}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {deleting === item.house_manage_no ? '삭제 중...' : '삭제'}
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
