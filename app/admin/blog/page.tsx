'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/app/admin/components/AdminHeader';
import DeleteModal from '@/app/admin/components/DeleteModal';

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  published_at: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  '부동산정보': { bg: '#eff6ff', color: '#1d4ed8' },
  '청약정보': { bg: '#f0fdf4', color: '#166534' },
  '세금/대출': { bg: '#fffbeb', color: '#92400e' },
  '매물분석': { bg: '#fdf4ff', color: '#7c3aed' },
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/blog')
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(d => { if (d) { setPosts(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [router]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/blog/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  };

  const filtered = posts.filter(p =>
    p.title.includes(search) || p.slug.includes(search) || p.category.includes(search)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {deleteTarget && (
        <DeleteModal
          title="블로그 글을 삭제하시겠습니까?"
          description={`"${deleteTarget.title}" 글이 영구 삭제됩니다.`}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}

      <AdminHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>블로그 글 관리</h1>
          <Link
            href="/admin/blog/new"
            style={{
              padding: '10px 20px', borderRadius: 10, background: '#166534',
              color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none',
            }}
          >
            + 새 글 작성
          </Link>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>
          {loading ? '...' : `총 ${posts.length}건 (공개 ${posts.filter(p => p.is_published).length}건)`}
        </p>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제목·슬러그·카테고리 검색"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 9, border: '1.5px solid #d1d5db',
            fontSize: 14, boxSizing: 'border-box', marginBottom: 16, outline: 'none',
          }}
        />

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>불러오는 중...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ margin: 0 }}>글이 없습니다. 첫 번째 글을 작성해보세요.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(post => {
            const cat = CATEGORY_COLORS[post.category] ?? { bg: '#f3f4f6', color: '#374151' };
            return (
              <div key={post.id} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: post.is_published ? '#d1fae5' : '#f3f4f6',
                      color: post.is_published ? '#065f46' : '#6b7280',
                    }}>
                      {post.is_published ? '공개' : '비공개'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cat.bg, color: cat.color }}>
                      {post.category}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>/blog/{post.slug}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.description}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    작성: {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    {post.updated_at !== post.created_at && ` · 수정: ${new Date(post.updated_at).toLocaleDateString('ko-KR')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
                  >
                    보기
                  </Link>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(post)}
                    style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
