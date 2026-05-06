'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, DEFAULT_SECTIONS } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import dynamic from 'next/dynamic';
import Image from 'next/image';

type SaleSearchItem = {
  id: string;
  houseManageNo: string;
  name: string;
  location: string;
  region: string;
  district: string;
  buildingType: string;
  totalUnits: number;
  moveInDate?: string;
  contact?: string;
  hmpgUrl?: string;
  pblancUrl?: string;
};

type SaleDetailItem = {
  hmpgUrl?: string;
  pblancUrl?: string;
  announcementDate?: string;
  receiptStart?: string;
  receiptEnd?: string;
  moveInDate?: string;
  contact?: string;
  units?: Array<{ type: string; supplyArea: number; count: number; price: number }>;
};

type UnitPrice = { type: string; supplyArea: string; count: string; min: string; max: string };

function parseUnitPrices(area: string | null | undefined): UnitPrice[] {
  if (!area) return [{ type: '', supplyArea: '', count: '', min: '', max: '' }];
  try {
    const parsed = JSON.parse(area);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: { type?: string; supplyArea?: number | null; count?: number | null; min?: number | null; max?: number | null }) => ({
        type: p.type ?? '',
        supplyArea: p.supplyArea ? String(p.supplyArea) : '',
        count: p.count ? String(p.count) : '',
        min: p.min ? String(p.min) : '',
        max: p.max ? String(p.max) : '',
      }));
    }
  } catch { /* not JSON — legacy plain text */ }
  return area.split(',').map(t => ({ type: t.trim(), supplyArea: '', count: '', min: '', max: '' })).filter(r => r.type);
}

function fmtPreview(v: string): string {
  const n = Number(v);
  if (!n || n <= 0) return '';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.floor(n / 10000).toLocaleString()}만`;
  return `${n.toLocaleString()}원`;
}

const AddressInput = dynamic(() => import('./AddressInput'), { ssr: false });
const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });
const SectionImageUploader = dynamic(() => import('./SectionImageUploader'), { ssr: false });

type FormData = Omit<UnsoldListing, 'id' | 'created_at' | 'updated_at'>;

const FIRST_SIDO = Object.keys(LAWD_CODE_MAP)[0] as keyof typeof LAWD_CODE_MAP;
const FIRST_SIGUNGU = LAWD_CODE_MAP[FIRST_SIDO][0].name;

const CATEGORY_MAP: Record<string, string> = {
  '아파트': '아파트',
  '오피스텔': '오피스텔',
  '도시형생활주택': '아파트',
  '상업시설': '상가',
};

const DEFAULT: FormData = {
  name: '',
  location: `${FIRST_SIDO} ${FIRST_SIGUNGU}`,
  category: '아파트',
  listing_type: '잔여세대',
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
  house_manage_no: null,
  contact: null,
  announcement_date: null,
  receipt_start: null,
  receipt_end: null,
  move_in_date: null,
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

  // 공식 홈페이지 미등록 여부 (체크하면 URL null 처리)
  const [noOfficialUrl, setNoOfficialUrl] = useState(initial?.official_url === null && !!id);

  // 전용면적별 분양가
  const [unitPrices, setUnitPrices] = useState<UnitPrice[]>(() => parseUnitPrices(initial?.area));

  const syncUnitPrices = (prices: UnitPrice[]) => {
    const valid = prices.filter(p => p.type.trim());
    const areaJson = valid.length > 0
      ? JSON.stringify(valid.map(p => ({
          type: p.type.trim(),
          supplyArea: p.supplyArea ? Number(p.supplyArea) : null,
          count: p.count ? Number(p.count) : null,
          min: p.min ? Number(p.min) : null,
          max: p.max ? Number(p.max) : null,
        })))
      : null;
    const mins = valid.map(p => Number(p.min)).filter(v => v > 0);
    const maxs = valid.map(p => Number(p.max)).filter(v => v > 0);
    setForm(prev => ({
      ...prev,
      area: areaJson,
      min_price: mins.length > 0 ? Math.min(...mins) : (maxs.length > 0 ? Math.min(...maxs) : null),
      max_price: maxs.length > 0 ? Math.max(...maxs) : null,
    }));
  };

  const updateUnit = (i: number, field: keyof UnitPrice, value: string) => {
    const next = unitPrices.map((row, idx) => idx === i ? { ...row, [field]: value } : row);
    setUnitPrices(next);
    syncUnitPrices(next);
  };

  const addUnit = () => setUnitPrices(prev => [...prev, { type: '', supplyArea: '', count: '', min: '', max: '' }]);

  const removeUnit = (i: number) => {
    const next = unitPrices.filter((_, idx) => idx !== i);
    const safe: UnitPrice[] = next.length > 0 ? next : [{ type: '', supplyArea: '', count: '', min: '', max: '' }];
    setUnitPrices(safe);
    syncUnitPrices(safe);
  };

  // 청약정보 불러오기
  const [importKeyword, setImportKeyword] = useState('');
  const [importResults, setImportResults] = useState<SaleSearchItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSaleItems = (keyword: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (keyword.length < 2) { setImportResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setImportLoading(true);
      try {
        const res = await fetch(`/api/admin/sale-search?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        setImportResults((data.items ?? []).slice(0, 8));
      } catch { setImportResults([]); } finally { setImportLoading(false); }
    }, 400);
  };

  const applyImport = async (item: SaleSearchItem) => {
    // 전체 주소 우선, 없으면 region+district 조합
    const location = item.location || (item.region && item.district
      ? `${item.region} ${item.district}`
      : item.region || form.location);

    // 기본 정보 즉시 반영 (검색 결과에서 바로 쓸 수 있는 필드 모두 적용)
    setForm(prev => ({
      ...prev,
      name: item.name || prev.name,
      location,
      category: CATEGORY_MAP[item.buildingType] || '아파트',
      total_units: item.totalUnits || prev.total_units,
      official_url: item.hmpgUrl || item.pblancUrl || prev.official_url,
      house_manage_no: item.houseManageNo || item.id || prev.house_manage_no,
      move_in_date: prev.move_in_date ?? item.moveInDate ?? null,
      contact: prev.contact ?? item.contact ?? null,
    }));
    setShowImport(false);
    setImportResults([]);
    setImportKeyword('');

    // 상세 API 호출해서 가격·전용면적 자동 입력
    const houseManageNo = item.houseManageNo || item.id;
    if (!houseManageNo) return;
    try {
      const res = await fetch(`/api/sale/detail?id=${houseManageNo}`);
      const data = await res.json();
      const detail = data.item as SaleDetailItem;
      if (!detail) return;

      // 전용면적별 분양가: API units → 타입별 그룹화 (특별공급+일반공급 합산)
      const grouped = new Map<string, { supplyArea: number; count: number; price: number }>();
      for (const u of (detail.units ?? [])) {
        if (!u.type) continue;
        const key = u.type.replace(/^0+/, '').replace(/\.0+$/, '');
        const prev = grouped.get(key);
        if (prev) {
          grouped.set(key, {
            supplyArea: prev.supplyArea || u.supplyArea,
            count: prev.count + u.count,
            price: Math.max(prev.price, u.price),
          });
        } else {
          grouped.set(key, { supplyArea: u.supplyArea, count: u.count, price: u.price });
        }
      }
      const newRows: UnitPrice[] = Array.from(grouped.entries()).map(([key, u]) => ({
        type: key,
        supplyArea: u.supplyArea > 0 ? String(u.supplyArea) : '',
        count: u.count > 0 ? String(u.count) : '',
        min: '',
        max: u.price > 0 ? String(u.price * 10000) : '',
      }));

      if (newRows.length > 0) {
        setUnitPrices(newRows);
        syncUnitPrices(newRows);
      }

      setForm(prev => ({
        ...prev,
        official_url: detail.hmpgUrl || detail.pblancUrl || prev.official_url,
        move_in_date: prev.move_in_date ?? detail.moveInDate ?? null,
        contact: prev.contact ?? detail.contact ?? null,
        announcement_date: prev.announcement_date ?? detail.announcementDate ?? null,
        receipt_start: prev.receipt_start ?? detail.receiptStart ?? null,
        receipt_end:   prev.receipt_end   ?? detail.receiptEnd   ?? null,
      }));
    } catch { /* 상세 조회 실패 시 무시 */ }
  };

  const set = (key: keyof FormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value === '' ? null : value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/unsold/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) set('thumbnail_url', data.url);
      else setError(data.error || '이미지 업로드 실패');
    } catch {
      setError('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
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

    try {
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
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
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

          {/* 청약정보에서 불러오기 */}
          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showImport ? 12 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>📋 청약정보에서 기본정보 불러오기</span>
              <button
                type="button"
                onClick={() => setShowImport(v => !v)}
                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #1d4ed8', background: showImport ? '#1d4ed8' : '#fff', color: showImport ? '#fff' : '#1d4ed8', cursor: 'pointer', fontWeight: 600 }}
              >
                {showImport ? '닫기' : '검색'}
              </button>
            </div>
            {showImport && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={importKeyword}
                    onChange={e => { setImportKeyword(e.target.value); searchSaleItems(e.target.value); }}
                    placeholder="단지명 또는 지역 검색 (2자 이상)"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
                  />
                  {importLoading && <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>검색 중...</span>}
                </div>
                {importResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                    {importResults.map((item: SaleSearchItem) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyImport(item)}
                        style={{
                          textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                          border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {item.buildingType} · {item.location} · {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '세대수 미상'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {importKeyword.length >= 2 && !importLoading && importResults.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>검색 결과가 없습니다.</p>
                )}
                {form.house_manage_no && (
                  <p style={{ fontSize: 11, color: '#059669', marginTop: 8, marginBottom: 0 }}>
                    ✅ 연결됨: {form.house_manage_no}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 기본 정보 */}
          <div>
            <label style={labelStyle}>단지명 *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 강남 더샵 리버파크" required />
          </div>

          <div>
            <label style={labelStyle}>위치 *</label>
            <AddressInput value={form.location ?? ''} onChange={val => set('location', val)} />
          </div>

          <div>
            <label style={labelStyle}>분양유형</label>
            <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* 세대 정보 */}
          <div>
            <label style={labelStyle}>총 세대수</label>
            <input style={inputStyle} type="number" value={form.total_units ?? ''} onChange={e => set('total_units', e.target.value)} placeholder="예: 500" />
          </div>

          {/* 전용면적별 분양가 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>전용면적별 분양가</label>
              {(form.min_price || form.max_price) && (
                <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
                  전체 {form.min_price && form.max_price && form.min_price !== form.max_price
                    ? `${fmtPreview(String(form.min_price))} ~ ${fmtPreview(String(form.max_price))}`
                    : fmtPreview(String(form.min_price || form.max_price))}
                </span>
              )}
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 90px 1fr 1fr 36px', background: '#f8fafc', padding: '8px 12px', gap: 8, minWidth: 560 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>타입</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>공급면적 (m²)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>공급세대</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>최저가 (원)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>최고가 (원)</span>
                <span />
              </div>
              {unitPrices.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 100px 90px 1fr 1fr 36px', gap: 8, padding: '8px 12px', borderTop: '1px solid #f3f4f6', alignItems: 'center', minWidth: 560 }}>
                  <input
                    style={{ ...inputStyle, padding: '7px 10px' }}
                    value={row.type}
                    onChange={e => updateUnit(i, 'type', e.target.value)}
                    placeholder="72A"
                  />
                  <input
                    style={{ ...inputStyle, padding: '7px 10px' }}
                    type="number"
                    value={row.supplyArea}
                    onChange={e => updateUnit(i, 'supplyArea', e.target.value)}
                    placeholder="98.47"
                  />
                  <input
                    style={{ ...inputStyle, padding: '7px 10px' }}
                    type="number"
                    value={row.count}
                    onChange={e => updateUnit(i, 'count', e.target.value)}
                    placeholder="50"
                  />
                  <div>
                    <input
                      style={{ ...inputStyle, padding: '7px 10px' }}
                      type="number"
                      value={row.min}
                      onChange={e => updateUnit(i, 'min', e.target.value)}
                      placeholder="350000000"
                    />
                    {row.min && <span style={{ fontSize: 10, color: '#1d4ed8', marginTop: 2, display: 'block' }}>{fmtPreview(row.min)}</span>}
                  </div>
                  <div>
                    <input
                      style={{ ...inputStyle, padding: '7px 10px' }}
                      type="number"
                      value={row.max}
                      onChange={e => updateUnit(i, 'max', e.target.value)}
                      placeholder="500000000"
                    />
                    {row.max && <span style={{ fontSize: 10, color: '#1d4ed8', marginTop: 2, display: 'block' }}>{fmtPreview(row.max)}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUnit(i)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6' }}>
                <button
                  type="button"
                  onClick={addUnit}
                  style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}
                >+ 타입 추가</button>
              </div>
            </div>
          </div>

          {/* 문의전화 */}
          <div>
            <label style={labelStyle}>문의전화</label>
            <input style={inputStyle} value={form.contact ?? ''} onChange={e => set('contact', e.target.value)} placeholder="예: 1588-0000" />
          </div>

          {/* 청약 일정 */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>청약 일정</label>
            <div>
              <label style={{ ...labelStyle, fontSize: 12, color: '#6b7280' }}>입주 예정</label>
              <input style={inputStyle} type="date" value={form.move_in_date ?? ''} onChange={e => set('move_in_date', e.target.value)} />
            </div>
          </div>

          {/* 혜택 */}
          <div>
            <label style={labelStyle}>계약 혜택</label>
            <input style={inputStyle} value={form.benefit ?? ''} onChange={e => set('benefit', e.target.value)} placeholder="예: 계약금 정액제 + 중도금 무이자" />
          </div>

          {/* 공식 URL */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>공식 홈페이지 URL</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={noOfficialUrl}
                  onChange={e => {
                    setNoOfficialUrl(e.target.checked);
                    if (e.target.checked) set('official_url', null);
                  }}
                />
                미등록 (공식 홈페이지 없음)
              </label>
            </div>
            {!noOfficialUrl && (
              <input style={inputStyle} value={form.official_url ?? ''} onChange={e => set('official_url', e.target.value)} placeholder="https://..." />
            )}
            {noOfficialUrl && (
              <div style={{ padding: '9px 12px', borderRadius: 8, border: '1px dashed #d1d5db', fontSize: 13, color: '#9ca3af', background: '#f9fafb' }}>
                공식 홈페이지 미등록 상태입니다.
              </div>
            )}
          </div>

          {/* 썸네일 이미지 */}
          <div>
            <label style={labelStyle}>썸네일 이미지</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: 13, marginBottom: 8 }} />
            {uploading && <p style={{ fontSize: 12, color: '#6b7280' }}>업로드 중...</p>}
            {form.thumbnail_url && (
              <div style={{ marginTop: 8 }}>
                <Image src={form.thumbnail_url} alt="썸네일" width={200} height={120}
                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
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
                분양일정·공급안내·사업개요·입지환경·프리미엄·평면도 순서로 이미지를 올려주세요.
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
