'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Clock, TrendingUp } from 'lucide-react';

type Complex = {
  slug: string; name: string; sido: string;
  sigungu: string; dong: string | null;
  total_units: number | null; built_year: number | null;
};

const RECENT_KEY = 'complex_recent_searches';

function loadRecent(): Complex[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(item: Complex) {
  try {
    const list = [item, ...loadRecent().filter(r => r.slug !== item.slug)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /**/ }
}

export default function ComplexLandingClient({ popularComplexes }: { popularComplexes: Complex[] }) {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent]   = useState<Complex[]>([]);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRecent(loadRecent()); }, []);

  // 검색 (디바운스 200ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/complex/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
  }, [query]);

  function navigate(item: Complex) {
    saveRecent(item);
    setRecent(loadRecent());
    router.push(`/complex/${encodeURIComponent(item.slug)}`);
  }

  const showDropdown = focused && (query ? results.length > 0 || loading : recent.length > 0);

  return (
    <div>
      {/* 히어로 섹션 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        padding: '64px 16px 80px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 14 }}>
            전국 21,000개 단지
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>
            아파트 단지<br />실거래가 시세 조회
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 36px' }}>
            평형별 가격 추이 · 교통 · 학군 · 주변 인프라
          </p>

          {/* 검색 바 */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#fff', borderRadius: 14,
              padding: '14px 20px', gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              border: focused ? '2px solid #2563eb' : '2px solid transparent',
            }}>
              <Search size={20} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="아파트 단지명으로 검색 (예: 래미안퍼스티지, 헬리오시티)"
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 16, color: '#1e293b', background: 'transparent',
                }}
              />
              {loading && (
                <div style={{ width: 18, height: 18, border: '2px solid #e5e7eb', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
              )}
            </div>

            {/* 드롭다운 */}
            {showDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: '#fff', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                overflow: 'hidden', zIndex: 100, textAlign: 'left',
              }}>
                {!query && recent.length > 0 && (
                  <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>최근 검색</div>
                )}
                {(query ? results : recent).map((item, i) => (
                  <button
                    key={item.slug}
                    onMouseDown={() => navigate(item)}
                    style={{
                      width: '100%', border: 'none', background: 'transparent',
                      padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: i < (query ? results : recent).length - 1 ? '1px solid #f9fafb' : 'none',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {!query ? <Clock size={14} color="#9ca3af" /> : <Building2 size={14} color="#2563eb" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {item.sido} {item.sigungu}{item.dong ? ' ' + item.dong : ''}
                        {item.total_units ? ` · ${item.total_units.toLocaleString()}세대` : ''}
                      </div>
                    </div>
                  </button>
                ))}
                {query && results.length === 0 && !loading && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* 최근 검색 */}
        {recent.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#6b7280" /> 최근 검색
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recent.map(item => (
                <button
                  key={item.slug}
                  onClick={() => navigate(item)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid #e5e7eb',
                    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: '#374151', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Building2 size={13} color="#6b7280" />
                  {item.name}
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.sigungu}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 주요 단지 */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="#2563eb" /> 주요 단지
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {popularComplexes.map(item => (
              <button
                key={item.slug}
                onClick={() => navigate(item)}
                style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                  padding: '16px', cursor: 'pointer', textAlign: 'left',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#bfdbfe';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {item.sigungu}{item.dong ? ' ' + item.dong : ''}
                </div>
                {(item.total_units || item.built_year) && (
                  <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 6, display: 'flex', gap: 6 }}>
                    {item.total_units && <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 10 }}>{item.total_units.toLocaleString()}세대</span>}
                    {item.built_year && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 10 }}>{item.built_year}년</span>}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 안내 배너 */}
        <div style={{
          marginTop: 40, background: '#1e3a5f', borderRadius: 16,
          padding: '24px 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ margin: '0 0 4px', color: '#fff', fontWeight: 700, fontSize: 15 }}>전국 21,000개 단지 데이터 제공</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>국토교통부 실거래 공공데이터 기반 · 매일 업데이트</p>
          </div>
          <button
            onClick={() => inputRef.current?.focus()}
            style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: '#2563eb', color: '#fff', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            단지 검색하기
          </button>
        </div>
      </div>
    </div>
  );
}
