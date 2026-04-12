'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, DEFAULT_SECTIONS } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import dynamic from 'next/dynamic';

const LocationSelector = dynamic(() => import('./LocationSelector'), { ssr: false });

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });
const SectionImageUploader = dynamic(() => import('./SectionImageUploader'), { ssr: false });

type FormData = Omit<UnsoldListing, 'id' | 'created_at' | 'updated_at'>;

const FIRST_SIDO = Object.keys(LAWD_CODE_MAP)[0] as keyof typeof LAWD_CODE_MAP;
const FIRST_SIGUNGU = LAWD_CODE_MAP[FIRST_SIDO][0].name;

const DEFAULT: FormData = {
  name: '',
  location: `${FIRST_SIDO} ${FIRST_SIGUNGU}`,
  category: '아파트',
  total_units: null,
  remaining_units: null,
  min_price: null,
  max_price: null,
  area: null,
  benefit: null,
  official_url: null,
  thumbnail_url: null,
  description: null,
  sections: DEFAULT_SECTIONS,
  highlight: false,
  is_active: true,
};

export default function UnsoldForm({ initial, id }: { initial?: Partial<FormData>; id?: string }) {
  const [form, setForm] = useState<FormData>({
    ...DEFAULT,
    ...initial,
    // 기존 섹션이 없거나 빈 배열이면 기본 섹션으로
    sections: (initial?.sections && initial.sections.length > 0)
      ? initial.sections
      : DEFAULT_SECTIONS,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const isEdit = !!id;

  const set = (key: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value === '' ? null : value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/unsold/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) set('thumbnail_url', data.url);
    else setError('이미지 업로드 실패');
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location) { setError('단지명과 위치는 필수입니다.'); return; }
    setSaving(true);
    setError('');

    const body = {
      ...form,
      total_units: form.total_units ? Number(form.total_units) : null,
      remaining_units: form.remaining_units ? Number(form.remaining_units) : null,
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
    };

    const res = await fetch(isEdit ? `/api/admin/unsold/${id}` : '/api/admin/unsold', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push('/admin/unsold');
    } else {
      const data = await res.json();
      setError(data.error || '저장 실패');
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const,
  };
  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 600 as const, color: '#374151', marginBottom: 5 };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🏠 관리자</span>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>{isEdit ? '매물 수정' : '매물 등록'}</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>← 뒤로</button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>{isEdit ? '매물 수정' : '새 매물 등록'}</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '28px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 기본 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>단지명 *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 강남 더샵 리버파크" required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>위치 *</label>
              <LocationSelector
                value={form.location ?? ''}
                onChange={val => set('location', val)}
              />
            </div>
            <div>
              <label style={labelStyle}>분양유형</label>
              <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>전용면적</label>
              <input style={inputStyle} value={form.area ?? ''} onChange={e => set('area', e.target.value)} placeholder="예: 59㎡ ~ 84㎡" />
            </div>
          </div>

          {/* 세대 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>총 세대수</label>
              <input style={inputStyle} type="number" value={form.total_units ?? ''} onChange={e => set('total_units', e.target.value)} placeholder="예: 500" />
            </div>
            <div>
              <label style={labelStyle}>잔여 세대수</label>
              <input style={inputStyle} type="number" value={form.remaining_units ?? ''} onChange={e => set('remaining_units', e.target.value)} placeholder="예: 120" />
            </div>
          </div>

          {/* 가격 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>최저가 (만원)</label>
              <input style={inputStyle} type="number" value={form.min_price ?? ''} onChange={e => set('min_price', e.target.value)} placeholder="예: 30000" />
            </div>
            <div>
              <label style={labelStyle}>최고가 (만원)</label>
              <input style={inputStyle} type="number" value={form.max_price ?? ''} onChange={e => set('max_price', e.target.value)} placeholder="예: 50000" />
            </div>
          </div>

          {/* 혜택 */}
          <div>
            <label style={labelStyle}>계약 혜택</label>
            <input style={inputStyle} value={form.benefit ?? ''} onChange={e => set('benefit', e.target.value)} placeholder="예: 계약금 정액제 + 중도금 무이자" />
          </div>

          {/* 공식 URL */}
          <div>
            <label style={labelStyle}>공식 홈페이지 URL</label>
            <input style={inputStyle} value={form.official_url ?? ''} onChange={e => set('official_url', e.target.value)} placeholder="https://..." />
          </div>

          {/* 썸네일 이미지 */}
          <div>
            <label style={labelStyle}>썸네일 이미지</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: 13, marginBottom: 8 }} />
            {uploading && <p style={{ fontSize: 12, color: '#6b7280' }}>업로드 중...</p>}
            {form.thumbnail_url && (
              <div style={{ marginTop: 8 }}>
                <img src={form.thumbnail_url} alt="썸네일" style={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <button type="button" onClick={() => set('thumbnail_url', null)} style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>이미지 제거</button>
              </div>
            )}
          </div>

          {/* 상세 설명 */}
          <div>
            <label style={labelStyle}>상세 설명 (선택 · 이미지·서식 지원)</label>
            <RichTextEditor
              value={form.description ?? ''}
              onChange={val => set('description', val)}
            />
          </div>

          {/* 섹션별 이미지 */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, fontSize: 15 }}>섹션별 이미지</label>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                분양일정·공급안내·사업개요·입지환경·프리미엄·평면도 순서로 이미지를 올려주세요. 여러 장 한 번에 선택 가능합니다.
              </p>
            </div>
            <SectionImageUploader
              sections={form.sections}
              onChange={sections => set('sections', sections)}
            />
          </div>

          {/* 옵션 */}
          <div style={{ display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.highlight} onChange={e => set('highlight', e.target.checked)} />
              ⭐ 주목 단지로 표시
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
              공개 (활성화)
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
              style={{ padding: '10px 28px', borderRadius: 8, background: saving ? '#9ca3af' : '#1d4ed8', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
