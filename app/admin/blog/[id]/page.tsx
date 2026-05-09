'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BlogEditor, { type BlogPostData } from '../BlogEditor';

export default function EditBlogPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BlogPostData | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/admin/blog/${id}`)
      .then(r => {
        if (r.status === 401) { router.push('/admin'); return null; }
        if (!r.ok) { setError('글을 불러올 수 없습니다.'); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setError('오류가 발생했습니다.'));
  }, [id, router]);

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 16 }}>
      {error}
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
      불러오는 중...
    </div>
  );

  return <BlogEditor initial={data} />;
}
