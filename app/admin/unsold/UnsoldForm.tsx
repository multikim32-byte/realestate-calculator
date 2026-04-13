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
    sections: (initial?.sections && initial.sections.length > 0) ? initial.sections : DEFAULT_SECTIONS,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const isEdit = !!id;

  // URL 불러오기 상태
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeHtml, setScrapeHtml] = useState('');
  const [scrapeTab, setScrapeTab] = useState<'paste' | 'url'>('paste');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [extractedImages, setExtractedImages] = useState<string[]>([]);

  const set = (key: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value === '' ? null : value }));

  // 공통: HTML + URL 받아서 서버 API 호출
  const runScrape = async (html: string, targetUrl: string) => {
    setScraping(true);
    setScrapeError('');
    setExtractedImages([]);
    try {
      const res = await fetch('/api/admin/unsold/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, html }),
      });
      const data = await res.json();
      if (!res.ok) { setScrapeError(data.error || '분석 실패'); return; }

      if (data.name)          set('name', data.name);
      if (data.category)      set('category', data.category);
      if (data.min_price)     set('min_price', data.min_price);
      if (data.benefit)       set('benefit', data.benefit);
      if (data.description)   set('description', data.description);
      if (data.thumbnail_url) set('thumbnail_url', data.thumbnail_url);
      if (data.location)      set('location', data.location);
      if (!form.official_url) set('official_url', targetUrl);
      setExtractedImages(data.extracted_images ?? []);
    } catch (e) {
      setScrapeError(String(e));
    } finally {
      setScraping(false);
    }
  };

  // 탭 1: HTML 직접 붙여넣기
  const handlePasteScrape = () => {
    if (!scrapeHtml.trim() || !scrapeUrl.trim()) {
      setScrapeError('URL과 HTML 소스 모두 입력해 주세요.');
      return;
    }
    runScrape(scrapeHtml, scrapeUrl);
  };

  // 탭 2: URL 자동 (CORS 프록시 시도)
  const handleUrlScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError('');
    let html = '';
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(scrapeUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(scrapeUrl)}`,
    ];
    for (const p of proxies) {
      try {
        const r = await fetch(p, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) continue;
        const d = await r.json();
        html = typeof d.contents === 'string' ? d.contents : '';
        if (html.length > 500) break;
      } catch {}
    }
    setScraping(false);
    if (html.length < 500) {
      // 프록시 실패 → 붙여넣기 탭으로 안내
      setScrapeTab('paste');
      setScrapeError('자동 가져오기가 차단되었습니다. 아래 방법으로 HTML 소스를 직접 붙여넣어 주세요.');
      return;
    }
    runScrape(html, scrapeUrl);
  };

  // 추출된 이미지를 특정 섹션에 추가
  const addImageToSection = (imgUrl: string, sectionName: string) => {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.name === sectionName && !s.images.includes(imgUrl)
          ? { ...s, images: [...s.images, imgUrl] }
          : s
      ),
    }));
  };

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
  const labelStyle = {
    display: 'block' as const, fontSize: 13, fontWeight: 600 as const,
    color: '#374151', marginBottom: 5,
  };

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

          {/* ── 사이트 자동 입력 ── */}
          <div style={{ border: '1px solid #bae6fd', borderRadius: 12, overflow: 'hidden' }}>
            {/* 탭 헤더 */}
            <div style={{ display: 'flex', background: '#f0f9ff' }}>
              {(['paste', 'url'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setScrapeTab(tab); setScrapeError(''); }}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: scrapeTab === tab ? '#0284c7' : 'transparent',
                    color: scrapeTab === tab ? '#fff' : '#0369a1',
                  }}
                >
                  {tab === 'paste' ? '📋 HTML 소스 붙여넣기 (권장)' : '🔗 URL 자동 (시도)'}
                </button>
              ))}
            </div>

            <div style={{ padding: '16px 20px', background: '#fff' }}>
              {/* 공통: URL 입력 */}
              <div style={{ marginBottom: 10 }}>
                <label style={{ ...labelStyle, marginBottom: 4 }}>분양 사이트 URL</label>
                <input
                  style={{ ...inputStyle }}
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://분양사이트.com/"
                />
              </div>

              {/* 탭 1: HTML 붙여넣기 */}
              {scrapeTab === 'paste' && (
                <>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#92400e', lineHeight: 1.9 }}>
                    <strong>사용 방법 (모든 사이트 작동):</strong><br />
                    1. URL을 새 탭에서 열고 페이지가 완전히 로딩될 때까지 기다리기<br />
                    2. 키보드 <strong>F12</strong> → 상단 <strong>Console</strong> 탭 클릭<br />
                    3. 아래 명령어를 콘솔에 입력 후 <strong>Enter</strong><br />
                    <code style={{ display: 'block', background: '#1e293b', color: '#86efac', padding: '6px 10px', borderRadius: 6, margin: '6px 0', fontFamily: 'monospace', fontSize: 12, userSelect: 'all' }}>
                      copy(document.documentElement.outerHTML)
                    </code>
                    4. 클립보드에 자동 복사됨 → 아래 입력란에 <strong>Ctrl+V</strong>
                  </div>
                  <textarea
                    style={{ ...inputStyle, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                    value={scrapeHtml}
                    onChange={e => setScrapeHtml(e.target.value)}
                    placeholder="여기에 Ctrl+V로 HTML 소스를 붙여넣으세요..."
                  />
                  <button
                    type="button"
                    onClick={handlePasteScrape}
                    disabled={scraping || !scrapeHtml.trim() || !scrapeUrl.trim()}
                    style={{
                      marginTop: 10, width: '100%', padding: '10px 0', background: scraping ? '#9ca3af' : '#0284c7',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                      cursor: scraping ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {scraping ? '분석 중… (이미지 업로드 포함, 30초 소요)' : 'AI 분석 시작'}
                  </button>
                </>
              )}

              {/* 탭 2: URL 자동 */}
              {scrapeTab === 'url' && (
                <>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                    CORS 프록시로 자동 시도합니다. 차단된 사이트는 HTML 소스 붙여넣기 탭을 이용하세요.
                  </p>
                  <button
                    type="button"
                    onClick={handleUrlScrape}
                    disabled={scraping || !scrapeUrl.trim()}
                    style={{
                      width: '100%', padding: '10px 0', background: scraping ? '#9ca3af' : '#0284c7',
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                      cursor: scraping ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {scraping ? '가져오는 중…' : '자동 불러오기'}
                  </button>
                </>
              )}

              {scrapeError && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{scrapeError}</p>
              )}
            </div>
          </div>

          {/* ── 추출된 이미지 갤러리 ── */}
          {extractedImages.length > 0 && (
            <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
              <label style={{ ...labelStyle, fontSize: 14, marginBottom: 12 }}>
                📸 추출된 이미지 ({extractedImages.length}장) — 클릭하여 썸네일 지정 또는 섹션 배정
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {extractedImages.map((imgUrl, i) => {
                  const isThumbnail = form.thumbnail_url === imgUrl;
                  const assignedSections = form.sections.filter(s => s.images.includes(imgUrl)).map(s => s.name);
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: 8, overflow: 'hidden',
                        border: isThumbnail ? '3px solid #1d4ed8' : '2px solid #e5e7eb',
                        background: '#fff',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                        onClick={() => set('thumbnail_url', isThumbnail ? null : imgUrl)}
                        title="클릭하면 썸네일로 설정"
                      />
                      <div style={{ padding: '6px 6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => set('thumbnail_url', isThumbnail ? null : imgUrl)}
                          style={{
                            fontSize: 11, padding: '3px 0', borderRadius: 4, border: 'none',
                            background: isThumbnail ? '#1d4ed8' : '#e0e7ff',
                            color: isThumbnail ? '#fff' : '#3730a3',
                            cursor: 'pointer', fontWeight: 700,
                          }}
                        >
                          {isThumbnail ? '✓ 썸네일' : '썸네일로'}
                        </button>
                        <select
                          style={{ fontSize: 11, borderRadius: 4, border: '1px solid #d1d5db', padding: '3px 4px', cursor: 'pointer' }}
                          value=""
                          onChange={e => { if (e.target.value) addImageToSection(imgUrl, e.target.value); }}
                        >
                          <option value="">섹션에 추가 ▾</option>
                          {form.sections.map(s => (
                            <option key={s.name} value={s.name} disabled={s.images.includes(imgUrl)}>
                              {s.images.includes(imgUrl) ? `✓ ${s.name}` : s.name}
                            </option>
                          ))}
                        </select>
                        {assignedSections.length > 0 && (
                          <p style={{ fontSize: 10, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
                            {assignedSections.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 기본 정보 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>단지명 *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 강남 더샵 리버파크" required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>위치 *</label>
              <LocationSelector value={form.location ?? ''} onChange={val => set('location', val)} />
            </div>
            <div>
              <label style={labelStyle}>분양유형</label>
              <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* 세대 정보 */}
          <div>
            <label style={labelStyle}>총 세대수</label>
            <input style={inputStyle} type="number" value={form.total_units ?? ''} onChange={e => set('total_units', e.target.value)} placeholder="예: 500" />
          </div>

          {/* 가격 */}
          <div>
            <label style={labelStyle}>최저가 (만원)</label>
            <input style={inputStyle} type="number" value={form.min_price ?? ''} onChange={e => set('min_price', e.target.value)} placeholder="예: 30000" />
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
            <label style={labelStyle}>썸네일 이미지 (직접 업로드)</label>
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
            <RichTextEditor value={form.description ?? ''} onChange={val => set('description', val)} />
          </div>

          {/* 섹션별 이미지 */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, fontSize: 15 }}>섹션별 이미지</label>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                분양일정·공급안내·사업개요·입지환경·프리미엄·평면도 순서로 이미지를 올려주세요. 위 갤러리에서 섹션 배정도 가능합니다.
              </p>
            </div>
            <SectionImageUploader sections={form.sections} onChange={sections => set('sections', sections)} />
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
