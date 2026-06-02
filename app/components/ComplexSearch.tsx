'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building2, Clock } from 'lucide-react';

type Result = {
  slug: string; name: string; sido: string;
  sigungu: string; dong: string | null;
  total_units: number | null; built_year: number | null;
};

const RECENT_KEY = 'complex_recent_searches';
const MAX_RECENT = 5;

function loadRecent(): Result[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(item: Result) {
  try {
    const list = [item, ...loadRecent().filter(r => r.slug !== item.slug)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* 무시 */ }
}

export default function ComplexSearch() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [recent, setRecent]   = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 모달 열기
  const openModal = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults([]);
    setCursor(-1);
    setRecent(loadRecent());
  }, []);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  // Cmd+K / Ctrl+K 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openModal(); }
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openModal, closeModal]);

  // 모달 열리면 input 포커스
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // 검색 (디바운스 200ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setCursor(-1); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/complex/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
        setCursor(-1);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
  }, [query]);

  // 단지 이동
  function navigate(item: Result) {
    saveRecent(item);
    setRecent(loadRecent());
    closeModal();
    router.push(`/complex/${encodeURIComponent(item.slug)}`);
  }

  // 키보드 네비게이션
  function onKeyDown(e: React.KeyboardEvent) {
    const list = query ? results : recent;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, list.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === 'Enter' && cursor >= 0 && list[cursor]) navigate(list[cursor]);
  }

  const displayList = query ? results : recent;
  const showRecent  = !query && recent.length > 0;

  return (
    <>
      {/* 검색 버튼 */}
      <button
        onClick={openModal}
        title="단지 검색 (Ctrl+K)"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          background: '#f3f4f6', border: '1px solid #e5e7eb',
          color: '#6b7280', fontSize: 13, fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        <Search size={14} />
        <span className="gnav-pc" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          단지검색
          <kbd style={{
            fontSize: 10, background: '#e5e7eb', borderRadius: 4,
            padding: '1px 5px', color: '#9ca3af', fontFamily: 'monospace',
          }}>⌘K</kbd>
        </span>
      </button>

      {/* 검색 모달 오버레이 */}
      {open && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '10vh',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16,
              width: 'min(560px, calc(100vw - 32px))',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* 검색 입력 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <Search size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="아파트 단지명으로 검색 (예: 래미안퍼스티지)"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 16, color: '#1e293b', background: 'transparent',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                  <X size={16} />
                </button>
              )}
              <button onClick={closeModal} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#6b7280', fontSize: 12, padding: '4px 8px' }}>
                ESC
              </button>
            </div>

            {/* 결과 목록 */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {/* 로딩 */}
              {loading && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  검색 중...
                </div>
              )}

              {/* 섹션 제목 */}
              {!loading && showRecent && (
                <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>
                  최근 검색
                </div>
              )}
              {!loading && query && results.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  &apos;{query}&apos;에 해당하는 단지가 없습니다
                </div>
              )}

              {/* 결과 아이템 */}
              {!loading && displayList.map((item, i) => (
                <button
                  key={item.slug}
                  onClick={() => navigate(item)}
                  style={{
                    width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
                    padding: '12px 20px',
                    background: cursor === i ? '#eff6ff' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < displayList.length - 1 ? '1px solid #f9fafb' : 'none',
                  }}
                  onMouseEnter={() => setCursor(i)}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: showRecent && !query ? '#f3f4f6' : '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {showRecent && !query
                      ? <Clock size={16} color="#9ca3af" />
                      : <Building2 size={16} color="#2563eb" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      {item.sido} {item.sigungu}{item.dong ? ' ' + item.dong : ''}
                      {item.total_units ? ` · ${item.total_units.toLocaleString()}세대` : ''}
                      {item.built_year ? ` · ${item.built_year}년` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, flexShrink: 0 }}>
                    시세 보기 →
                  </div>
                </button>
              ))}

              {/* 하단 안내 */}
              {!query && recent.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  <Building2 size={32} color="#e5e7eb" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  아파트 단지명을 입력하세요<br />
                  <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>전국 21,000개 단지 검색 가능</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
