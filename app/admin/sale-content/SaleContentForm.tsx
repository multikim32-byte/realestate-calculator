'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { SaleContent } from '@/lib/saleContent';

const RichTextEditor = dynamic(() => import('../unsold/RichTextEditor'), { ssr: false });

type SaleRef = {
  name: string;
  location: string;
  buildingType: string;
  totalUnits: number;
  receiptStart: string;
  receiptEnd: string;
  status: string;
};

type FormData = {
  summary: string;
  description: string;
  pros: string;
  cons: string;
  thumbnail_url: string;
  image_urls: string[];
  is_published: boolean;
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const,
};
const labelStyle = {
  display: 'block' as const, fontSize: 13, fontWeight: 600 as const,
  color: '#374151', marginBottom: 5,
};

function toForm(c: SaleContent | null): FormData {
  return {
    summary: c?.summary ?? '',
    description: c?.description ?? '',
    pros: (c?.pros ?? []).join('\n'),
    cons: (c?.cons ?? []).join('\n'),
    thumbnail_url: c?.thumbnail_url ?? '',
    image_urls: c?.image_urls ?? [],
    is_published: c?.is_published ?? true,
  };
}

export default function SaleContentForm({
  houseManageNo,
  initial,
  saleRef,
}: {
  houseManageNo: string;
  initial: SaleContent | null;
  saleRef: SaleRef | null;
}) {
  const [form, setForm] = useState<FormData>(toForm(initial));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const set = (key: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/unsold/upload', { method: 'POST', body: fd });
    const data = await res.json();
    return data.url ?? null;
  };

  const handleThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) set('thumbnail_url', url);
      else setError('썸네일 업로드 실패');
    } finally { setUploading(false); }
  };

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadImage));
      const valid = urls.filter(Boolean) as string[];
      set('image_urls', [...form.image_urls, ...valid]);
    } finally { setUploading(false); }
  };

  const removeImage = (idx: number) =>
    set('image_urls', form.image_urls.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        house_manage_no: houseManageNo,
        summary: form.summary || null,
        description: form.description || null,
        pros: form.pros ? form.pros.split('\n').map(s => s.trim()).filter(Boolean) : null,
        cons: form.cons ? form.cons.split('\n').map(s => s.trim()).filter(Boolean) : null,
        thumbnail_url: form.thumbnail_url || null,
        image_urls: form.image_urls.length > 0 ? form.image_urls : null,
        is_published: form.is_published,
      };
      const res = await fetch(`/api/admin/sale-content/${houseManageNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push('/admin/sale-content');
      } else {
        const data = await res.json();
        setError(data.error || '저장 실패');
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🏠 관리자</span>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>청약 에디토리얼 콘텐츠</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>← 뒤로</button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {initial ? '콘텐츠 수정' : '콘텐츠 작성'}
          </h1>
        </div>

        {/* 청약 기본 정보 참고 */}
        {saleRef && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', margin: '0 0 6px' }}>📋 연결된 청약 공고</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{saleRef.name}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              {saleRef.location} · {saleRef.buildingType} · {saleRef.totalUnits?.toLocaleString()}세대 · {saleRef.status}
              {saleRef.receiptStart && ` · 청약 ${saleRef.receiptStart}~${saleRef.receiptEnd}`}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>ID: {houseManageNo}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* 한줄 요약 */}
          <div>
            <label style={labelStyle}>한줄 요약 <span style={{ color: '#9ca3af', fontWeight: 400 }}>— 메타 description·페이지 인트로에 표시</span></label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="예: 서울 강남구 입지에 총 850세대 규모의 대단지 아파트. 9호선 직세권, 분양가 상한제 적용으로 주변 시세 대비 저렴한 분양가가 장점."
            />
          </div>

          {/* 상세 설명 */}
          <div>
            <label style={labelStyle}>상세 설명 <span style={{ color: '#9ca3af', fontWeight: 400 }}>— 이미지·서식 지원 (검색 엔진이 읽는 핵심 콘텐츠)</span></label>
            <RichTextEditor value={form.description} onChange={val => set('description', val)} />
          </div>

          {/* 장점 */}
          <div>
            <label style={labelStyle}>장점 목록 <span style={{ color: '#9ca3af', fontWeight: 400 }}>— 한 줄에 하나씩 입력</span></label>
            <textarea
              style={{ ...inputStyle, height: 120, resize: 'vertical' }}
              value={form.pros}
              onChange={e => set('pros', e.target.value)}
              placeholder={'9호선·GTX-A 더블역세권\n분양가 상한제 적용으로 시세 대비 20% 저렴\n브랜드 대형건설사 시공'}
            />
          </div>

          {/* 유의사항 */}
          <div>
            <label style={labelStyle}>유의사항 <span style={{ color: '#9ca3af', fontWeight: 400 }}>— 한 줄에 하나씩 입력</span></label>
            <textarea
              style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              value={form.cons}
              onChange={e => set('cons', e.target.value)}
              placeholder={'전용 59㎡ 이하는 특별공급 비율 높아 당첨 경쟁 치열\n인근 재건축 공사로 2027년까지 소음 예상'}
            />
          </div>

          {/* 대표 썸네일 */}
          <div>
            <label style={labelStyle}>대표 이미지 (썸네일) <span style={{ color: '#9ca3af', fontWeight: 400 }}>— SNS 공유·OG 이미지로 사용</span></label>
            <input type="file" accept="image/*" onChange={handleThumbnail} style={{ fontSize: 13, marginBottom: 8 }} />
            {uploading && <p style={{ fontSize: 12, color: '#6b7280' }}>업로드 중...</p>}
            {form.thumbnail_url && (
              <div style={{ marginTop: 8 }}>
                <img src={form.thumbnail_url} alt="썸네일"
                  style={{ width: 280, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    value={form.thumbnail_url}
                    onChange={e => set('thumbnail_url', e.target.value)}
                    placeholder="URL 직접 입력"
                  />
                  <button type="button" onClick={() => set('thumbnail_url', '')}
                    style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    제거
                  </button>
                </div>
              </div>
            )}
            {!form.thumbnail_url && (
              <input
                style={{ ...inputStyle, fontSize: 12, marginTop: 4 }}
                value={form.thumbnail_url}
                onChange={e => set('thumbnail_url', e.target.value)}
                placeholder="또는 이미지 URL 직접 입력"
              />
            )}
          </div>

          {/* 추가 이미지들 */}
          <div>
            <label style={labelStyle}>추가 이미지 <span style={{ color: '#9ca3af', fontWeight: 400 }}>— 페이지 갤러리에 표시 (복수 선택 가능)</span></label>
            <input type="file" accept="image/*" multiple onChange={handleImageAdd} style={{ fontSize: 13, marginBottom: 8 }} />
            {form.image_urls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
                {form.image_urls.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt={`이미지 ${i + 1}`}
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 공개 여부 */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={e => set('is_published', e.target.checked)}
              />
              공개 (청약 상세 페이지에 표시)
            </label>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => router.back()}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
              취소
            </button>
            <button type="submit" disabled={saving || uploading}
              style={{ padding: '10px 28px', borderRadius: 8, background: (saving || uploading) ? '#9ca3af' : '#1d4ed8', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer' }}>
              {saving ? '저장 중...' : initial ? '수정 완료' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
