'use client';

import { useRef, useState } from 'react';
import type { UnsoldSection } from '@/lib/supabase';

interface Props {
  sections: UnsoldSection[];
  onChange: (sections: UnsoldSection[]) => void;
}

export default function SectionImageUploader({ sections, onChange }: Props) {
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const compressImage = (file: File, maxWidth = 1400): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.82);
      };
      img.src = url;
    });

  const uploadImage = async (file: File, sectionName: string) => {
    setUploadingSection(sectionName);
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('file', new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
    const res = await fetch('/api/admin/unsold/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadingSection(null);
    if (data.url) return data.url as string;
    alert('업로드 실패');
    return null;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>, sectionName: string) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file, sectionName);
      if (url) urls.push(url);
    }

    onChange(sections.map(s =>
      s.name === sectionName ? { ...s, images: [...s.images, ...urls] } : s
    ));
    e.target.value = '';
  };

  const removeImage = (sectionName: string, idx: number) => {
    onChange(sections.map(s =>
      s.name === sectionName
        ? { ...s, images: s.images.filter((_, i) => i !== idx) }
        : s
    ));
  };

  const moveImage = (sectionName: string, from: number, to: number) => {
    onChange(sections.map(s => {
      if (s.name !== sectionName) return s;
      const imgs = [...s.images];
      const [moved] = imgs.splice(from, 1);
      imgs.splice(to, 0, moved);
      return { ...s, images: imgs };
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sections.map(section => (
        <div key={section.name} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {/* 섹션 헤더 */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{section.name}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{section.images.length}장</span>
              {uploadingSection === section.name && (
                <span style={{ fontSize: 12, color: '#1d4ed8' }}>업로드 중...</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRefs.current[section.name]?.click()}
              disabled={uploadingSection === section.name}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: uploadingSection === section.name ? 'not-allowed' : 'pointer',
              }}
            >
              + 이미지 추가
            </button>
            <input
              ref={el => { fileInputRefs.current[section.name] = el; }}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleFiles(e, section.name)}
              style={{ display: 'none' }}
            />
          </div>

          {/* 이미지 목록 */}
          <div style={{ padding: 16 }}>
            {section.images.length === 0 ? (
              <div
                onClick={() => fileInputRefs.current[section.name]?.click()}
                style={{
                  border: '2px dashed #d1d5db', borderRadius: 10, padding: '28px',
                  textAlign: 'center', color: '#9ca3af', fontSize: 13, cursor: 'pointer',
                }}
              >
                클릭하여 이미지 업로드 (여러 장 선택 가능)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.images.map((url, idx) => (
                  <div key={url} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', borderRadius: 10, padding: '8px 12px' }}>
                    {/* 순서 조정 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button type="button" onClick={() => moveImage(section.name, idx, idx - 1)} disabled={idx === 0}
                        style={{ padding: '2px 6px', fontSize: 11, borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? '#d1d5db' : '#374151' }}>▲</button>
                      <button type="button" onClick={() => moveImage(section.name, idx, idx + 1)} disabled={idx === section.images.length - 1}
                        style={{ padding: '2px 6px', fontSize: 11, borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', cursor: idx === section.images.length - 1 ? 'not-allowed' : 'pointer', color: idx === section.images.length - 1 ? '#d1d5db' : '#374151' }}>▼</button>
                    </div>

                    {/* 미리보기 */}
                    <img src={url} alt={`${section.name} ${idx + 1}`}
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }} />

                    {/* 파일명 */}
                    <span style={{ fontSize: 12, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {section.name} {idx + 1}번
                    </span>

                    {/* 삭제 */}
                    <button type="button" onClick={() => removeImage(section.name, idx)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                      삭제
                    </button>
                  </div>
                ))}

                {/* 추가 업로드 */}
                <button type="button" onClick={() => fileInputRefs.current[section.name]?.click()}
                  style={{ padding: '8px', borderRadius: 8, border: '1px dashed #d1d5db', background: '#fff', fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                  + 이미지 더 추가
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
