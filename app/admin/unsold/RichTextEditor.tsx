'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// 이미지 정렬을 위해 style 속성을 지원하도록 Image 확장
const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: 'display:block;margin:12px 0;max-width:100%;border-radius:8px;',
        parseHTML: (el) => el.getAttribute('style'),
        renderHTML: ({ style }) => (style ? { style } : {}),
      },
    };
  },
});

const btn = (active: boolean): React.CSSProperties => ({
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  background: active ? '#1d4ed8' : '#fff',
  color: active ? '#fff' : '#374151',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 700 : 400,
  lineHeight: 1,
});

export default function RichTextEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      AlignableImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // 외부 value 변경 시 동기화 (수정 페이지 초기 로드)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/unsold/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) {
      editor.chain().focus().setImage({
        src: data.url,
        alt: file.name,
        // @ts-ignore
        style: 'display:block;margin:12px 0;max-width:100%;border-radius:8px;',
      }).run();
    }
    e.target.value = '';
  };

  // 정렬 버튼: 이미지 선택 시 이미지 정렬, 아니면 텍스트 정렬
  const handleAlign = (align: 'left' | 'center' | 'right') => {
    if (editor.isActive('image')) {
      const styleMap = {
        left:   'display:block;margin:12px 0;max-width:100%;border-radius:8px;',
        center: 'display:block;margin:12px auto;max-width:100%;border-radius:8px;',
        right:  'display:block;margin:12px 0 12px auto;max-width:100%;border-radius:8px;',
      };
      editor.chain().focus().updateAttributes('image', { style: styleMap[align] }).run();
    } else {
      editor.chain().focus().setTextAlign(align).run();
    }
  };

  const isAlignActive = (align: 'left' | 'center' | 'right') => {
    if (editor.isActive('image')) {
      const attrs = editor.getAttributes('image');
      if (align === 'center') return (attrs.style ?? '').includes('margin:12px auto');
      if (align === 'right') return (attrs.style ?? '').includes('margin:12px 0 12px auto');
      return !((attrs.style ?? '').includes('auto'));
    }
    return editor.isActive({ textAlign: align });
  };

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {/* 텍스트 스타일 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive('bold'))}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive('italic'))}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} style={btn(editor.isActive('underline'))}><u>U</u></button>
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

        {/* 헤딩 */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(editor.isActive('heading', { level: 2 }))}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btn(editor.isActive('heading', { level: 3 }))}>H3</button>
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

        {/* 정렬 (텍스트 + 이미지 공용) */}
        <button type="button" onClick={() => handleAlign('left')}   style={btn(isAlignActive('left'))}  title="왼쪽 정렬">◀≡</button>
        <button type="button" onClick={() => handleAlign('center')} style={btn(isAlignActive('center'))} title="가운데 정렬">≡</button>
        <button type="button" onClick={() => handleAlign('right')}  style={btn(isAlignActive('right'))}  title="오른쪽 정렬">≡▶</button>
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

        {/* 목록 */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive('bulletList'))}>• 목록</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive('orderedList'))}>1. 목록</button>
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

        {/* 구분선 */}
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btn(false)}>— 구분선</button>
        <div style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />

        {/* 이미지 업로드 */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ ...btn(false), background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600 }}
        >
          🖼 이미지 삽입
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
      </div>

      {/* 이미지 선택 시 정렬 힌트 */}
      {editor.isActive('image') && (
        <div style={{ padding: '6px 12px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
          💡 이미지가 선택됨 — 위 정렬 버튼(◀≡ / ≡ / ≡▶)으로 이미지 위치를 조정하세요
        </div>
      )}

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        style={{ minHeight: 300, padding: '14px 16px', fontSize: 14, lineHeight: 1.8, color: '#374151' }}
      />

      {/* 에디터 스타일 */}
      <style>{`
        .ProseMirror { outline: none; min-height: 280px; }
        .ProseMirror h2 { font-size: 20px; font-weight: 800; margin: 16px 0 8px; color: #1e293b; }
        .ProseMirror h3 { font-size: 17px; font-weight: 700; margin: 14px 0 6px; color: #1e293b; }
        .ProseMirror p { margin: 0 0 8px; }
        .ProseMirror ul { padding-left: 20px; margin: 8px 0; }
        .ProseMirror ol { padding-left: 20px; margin: 8px 0; }
        .ProseMirror li { margin-bottom: 4px; }
        .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 12px 0; display: block; cursor: pointer; }
        .ProseMirror img.ProseMirror-selectednode { outline: 3px solid #1d4ed8; border-radius: 8px; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
    </div>
  );
}
