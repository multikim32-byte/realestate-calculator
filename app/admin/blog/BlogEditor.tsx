'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export type BlogPostData = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  thumbnail_url: string | null;
  category: string;
  is_published: boolean;
};

const CATEGORIES = ['부동산정보', '청약정보', '세금/대출', '매물분석'];

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[가-힣]/g, '') // 한글 제거
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export default function BlogEditor({ initial }: { initial: BlogPostData }) {
  const [form, setForm] = useState<BlogPostData>(initial);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key: keyof BlogPostData, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleTitleChange = (v: string) => {
    set('title', v);
    if (!form.id) set('slug', slugify(v)); // 새 글일 때만 자동생성
  };

  const uploadFile = async (file: File, type: 'thumbnail' | 'content') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/admin/blog/upload', { method: 'POST', body: fd });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '업로드 실패'); }
    return (await res.json()).url as string;
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    try {
      const url = await uploadFile(file, 'thumbnail');
      set('thumbnail_url', url);
      showToast('썸네일 업로드 완료');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '업로드 실패', false);
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleContentImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadFile(file, 'content');
      // 커서 위치에 <img> 태그 삽입
      const ta = contentRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const tag = `<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;" />`;
        const newVal = form.content.slice(0, start) + tag + form.content.slice(end);
        set('content', newVal);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + tag.length;
          ta.focus();
        }, 50);
      }
      setCopiedUrl(url);
      showToast('이미지 삽입됨 (URL은 클립보드에도 복사됨)');
      await navigator.clipboard.writeText(url).catch(() => {});
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '업로드 실패', false);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      showToast('제목, 슬러그, 요약은 필수입니다', false);
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/admin/blog/${form.id}` : '/api/admin/blog';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? '저장 실패', false); return; }
      showToast('저장됐습니다');
      if (!isEdit && data.id) {
        router.replace(`/admin/blog/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 700,
          background: toast.ok ? '#dcfce7' : '#fef2f2',
          color: toast.ok ? '#166534' : '#dc2626',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14,
        }}>{toast.msg}</div>
      )}

      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none' }}>🏠 관리자</Link>
          <Link href="/admin/blog" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>블로그 관리</Link>
          <span style={{ color: '#34d399', fontSize: 14, fontWeight: 700 }}>
            {form.id ? '글 수정' : '새 글 작성'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {form.slug && (
            <Link href={`/blog/${form.slug}`} target="_blank"
              style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>
              미리보기 ↗
            </Link>
          )}
          <Link href="/api/admin/logout" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>로그아웃</Link>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* 왼쪽: 본문 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 제목 */}
            <div>
              <label style={labelStyle}>제목 *</label>
              <input
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="블로그 글 제목"
                style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
              />
            </div>

            {/* 슬러그 */}
            <div>
              <label style={labelStyle}>슬러그 (URL) *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#9ca3af', flexShrink: 0 }}>/blog/</span>
                <input
                  value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                  placeholder="url-friendly-slug"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>영문 소문자·숫자·하이픈만 사용, 한글 제목은 자동 생성됩니다</p>
            </div>

            {/* 요약 */}
            <div>
              <label style={labelStyle}>요약 (SEO 설명) *</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="검색 결과에 표시되는 글 설명 (80~160자 권장)"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              <p style={{ margin: '4px 0 0', fontSize: 12, color: form.description.length > 160 ? '#dc2626' : '#9ca3af' }}>
                {form.description.length}자
              </p>
            </div>

            {/* 본문 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ ...labelStyle, margin: 0 }}>본문 (HTML)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* 이미지 삽입 */}
                  <label style={{
                    padding: '6px 12px', borderRadius: 7, border: '1px solid #d1d5db',
                    background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 600,
                  }}>
                    {uploadingImg ? '업로드 중...' : '🖼 이미지 삽입'}
                    <input type="file" accept="image/*" onChange={handleContentImgUpload} style={{ display: 'none' }} disabled={uploadingImg} />
                  </label>
                  <button
                    onClick={() => setPreview(p => !p)}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid #d1d5db',
                      background: preview ? '#1d4ed8' : '#fff', color: preview ? '#fff' : '#374151',
                      fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {preview ? '편집 모드' : '미리보기'}
                  </button>
                </div>
              </div>

              {preview ? (
                <div style={{
                  minHeight: 500, padding: '20px 24px', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: '#fff', fontSize: 15, color: '#333', lineHeight: 1.9,
                  overflowY: 'auto',
                }}
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              ) : (
                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  rows={28}
                  placeholder={'<h2>소제목</h2>\n<p>본문 내용...</p>\n<ul><li>항목</li></ul>'}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}
                />
              )}
            </div>

            {copiedUrl && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', wordBreak: 'break-all' }}>
                최근 업로드: {copiedUrl}
              </div>
            )}
          </div>

          {/* 오른쪽: 설정 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: saving ? '#86efac' : '#166534', color: '#fff',
                fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중...' : form.is_published ? '저장 (공개)' : '저장 (비공개)'}
            </button>

            {/* 공개 여부 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px' }}>
              <label style={labelStyle}>공개 여부</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: false, label: '비공개' }, { v: true, label: '공개' }].map(({ v, label }) => (
                  <button
                    key={String(v)}
                    onClick={() => set('is_published', v)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 8, border: '1.5px solid',
                      borderColor: form.is_published === v ? (v ? '#166534' : '#6b7280') : '#e5e7eb',
                      background: form.is_published === v ? (v ? '#f0fdf4' : '#f3f4f6') : '#fff',
                      color: form.is_published === v ? (v ? '#166534' : '#374151') : '#9ca3af',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px' }}>
              <label style={labelStyle}>카테고리</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => set('category', cat)}
                    style={{
                      padding: '8px 12px', borderRadius: 8, border: '1.5px solid',
                      borderColor: form.category === cat ? '#1d4ed8' : '#e5e7eb',
                      background: form.category === cat ? '#eff6ff' : '#fff',
                      color: form.category === cat ? '#1d4ed8' : '#374151',
                      fontSize: 13, fontWeight: form.category === cat ? 700 : 400,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 썸네일 */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px' }}>
              <label style={labelStyle}>썸네일 이미지</label>
              {form.thumbnail_url && (
                <div style={{ marginBottom: 10, position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9' }}>
                  <Image src={form.thumbnail_url} alt="" fill style={{ objectFit: 'cover' }} />
                  <button
                    onClick={() => set('thumbnail_url', null)}
                    style={{
                      position: 'absolute', top: 6, right: 6, padding: '3px 8px',
                      borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.6)',
                      color: '#fff', fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    제거
                  </button>
                </div>
              )}
              <label style={{
                display: 'block', padding: '9px', borderRadius: 8, border: '1.5px dashed #d1d5db',
                textAlign: 'center', fontSize: 13, color: '#6b7280', cursor: 'pointer',
                background: uploadingThumb ? '#f3f4f6' : '#fff',
              }}>
                {uploadingThumb ? '업로드 중...' : '클릭하여 이미지 선택'}
                <input type="file" accept="image/*" onChange={handleThumbUpload} style={{ display: 'none' }} disabled={uploadingThumb} />
              </label>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>WebP로 자동 변환 · 최대 800px</p>
            </div>

            {/* 슬러그 미리보기 */}
            {form.slug && (
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>공개 URL</div>
                <div style={{ fontSize: 12, color: '#374151', wordBreak: 'break-all' }}>
                  aptzipsa.kr/blog/{form.slug}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
