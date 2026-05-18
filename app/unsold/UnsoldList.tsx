'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import { formatWon } from '@/lib/formatUtils';

const FAV_KEY = 'mk_favorites';
function loadFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function toggleFavStorage(item: UnsoldListing) {
  const favs = loadFavs();
  const exists = favs.some((f: any) => f.id === item.id && f.type === 'unsold');
  const next = exists
    ? favs.filter((f: any) => !(f.id === item.id && f.type === 'unsold'))
    : [...favs, { id: item.id, type: 'unsold', name: item.name, location: item.location, savedAt: new Date().toISOString() }];
  try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  return !exists;
}

function FavBtn({ item }: { item: UnsoldListing }) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(loadFavs().some((f: any) => f.id === item.id && f.type === 'unsold'));
  }, [item.id]);
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); setFav(toggleFavStorage(item)); }}
      title={fav ? '관심 단지 해제' : '관심 단지 저장'}
      style={{
        position: 'absolute', top: 10, right: 10, zIndex: 2,
        background: fav ? '#fef3c7' : 'rgba(255,255,255,0.92)',
        border: `1px solid ${fav ? '#fcd34d' : '#e5e7eb'}`,
        borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, fontWeight: 700,
        color: fav ? '#b45309' : '#6b7280',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <span style={{ fontSize: 14 }}>{fav ? '★' : '☆'}</span>
      <span>{fav ? '저장됨' : '관심'}</span>
    </button>
  );
}

function parseAreaLabel(area: string | null | undefined): string | null {
  if (!area) return null;
  try {
    const parsed = JSON.parse(area);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const types = parsed.map((p: { type?: string }) => p.type).filter(Boolean);
      return types.length > 0 ? types.join(' / ') + '㎡' : null;
    }
  } catch {}
  return area;
}


// 전체 도명 → 약칭 정규화 테이블
const SIDO_NORMALIZE: Record<string, string> = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구',
  '인천광역시': '인천', '광주광역시': '광주', '대전광역시': '대전',
  '울산광역시': '울산', '세종특별자치시': '세종',
  '경기도': '경기', '강원도': '강원', '강원특별자치도': '강원',
  '충청북도': '충북', '충청남도': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남',
  '경상북도': '경북', '경상남도': '경남',
  '제주특별자치도': '제주',
};

function parseSido(location: string) {
  const word = location.trim().split(/\s+/)[0] ?? '';
  return SIDO_NORMALIZE[word] ?? word.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '');
}
function parseSigungu(location: string) {
  const parts = location.trim().split(/\s+/);
  return parts[1] ?? '';
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
  fontSize: 14, background: '#fff', color: '#374151', cursor: 'pointer',
  appearance: 'auto',
};

export default function UnsoldList({ listings }: { listings: UnsoldListing[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const PER_PAGE = 12;

  const [category, setCategory] = useState(searchParams.get('category') ?? '전체');
  const [sido, setSido] = useState(searchParams.get('sido') ?? '전체');
  const [sigungu, setSigungu] = useState(searchParams.get('sigungu') ?? '전체');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));

  const updateUrl = (overrides: Partial<{ category: string; sido: string; sigungu: string; page: number }>) => {
    const c = overrides.category ?? category;
    const s = overrides.sido ?? sido;
    const sg = overrides.sigungu ?? sigungu;
    const p = overrides.page ?? page;
    const sp = new URLSearchParams();
    if (c !== '전체') sp.set('category', c);
    if (s !== '전체') sp.set('sido', s);
    if (sg !== '전체') sp.set('sigungu', sg);
    if (p > 1) sp.set('page', String(p));
    const query = sp.toString();
    router.replace(`/unsold${query ? `?${query}` : ''}`, { scroll: false });
  };

  // 시도 목록 (location 첫 단어)
  const sidoList = useMemo(() => {
    const set = new Set(listings.map(l => parseSido(l.location)).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [listings]);

  // 시군구 목록 (선택된 시도 내 두 번째 단어)
  const sigunguList = useMemo(() => {
    const base = sido === '전체' ? listings : listings.filter(l => parseSido(l.location) === sido);
    const set = new Set(base.map(l => parseSigungu(l.location)).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [listings, sido]);

  const handleSidoChange = (val: string) => {
    setSido(val);
    setSigungu('전체');
    setPage(1);
    updateUrl({ sido: val, sigungu: '전체', page: 1 });
  };

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (category !== '전체' && l.category !== category) return false;
      if (sido !== '전체' && parseSido(l.location) !== sido) return false;
      if (sigungu !== '전체' && parseSigungu(l.location) !== sigungu) return false;
      return true;
    });
  }, [listings, category, sido, sigungu]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      {/* 관심단지 저장 안내 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '10px 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>☆</span>
          <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
            <strong>관심 단지 저장</strong>하면 다음 방문 때 바로 찾을 수 있어요
          </p>
        </div>
        <a href="/favorites" style={{ fontSize: 12, fontWeight: 700, color: '#059669', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          저장 목록 보기 →
        </a>
      </div>

      {/* 필터 바 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* 지역 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>지역</span>
          <select value={sido} onChange={e => handleSidoChange(e.target.value)} style={selectStyle}>
            {sidoList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {sigunguList.length > 2 && (
            <select value={sigungu} onChange={e => { setSigungu(e.target.value); setPage(1); updateUrl({ sigungu: e.target.value, page: 1 }); }} style={selectStyle}>
              {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>유형</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); updateUrl({ category: cat, page: 1 }); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 13,
                  fontWeight: category === cat ? 700 : 400,
                  background: category === cat ? '#1d4ed8' : '#f1f5f9',
                  color: category === cat ? '#fff' : '#374151',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
          총 <strong>{filtered.length}</strong>건
        </span>
      </div>

      {/* 빈 상태 */}
      {paged.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>조건에 맞는 매물이 없습니다.</p>
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {paged.map(item => (
          <div key={item.id} style={{ position: 'relative' }}>
            <FavBtn item={item} />
          <Link href={`/unsold/${item.slug ?? item.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#fff', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: item.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
              }}
            >
              {/* 썸네일 */}
              <div style={{ width: '100%', height: 200, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                {item.thumbnail_url ? (
                  <Image src={item.thumbnail_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 400px" style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🏢</div>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {item.highlight && (
                    <div style={{ background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                      ⭐ 주목 단지
                    </div>
                  )}
                </div>
                <div style={{ position: 'absolute', top: 10, right: 10, background: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                  {item.category}
                </div>
              </div>

              {/* 정보 */}
              <div style={{ padding: '14px 16px 16px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 10px', lineHeight: 1.4 }}>{item.name}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* 위치 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>위치</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>{item.location}</span>
                  </div>
                  {/* 공급규모 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>공급규모</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      {item.total_units ? `${item.total_units.toLocaleString()}세대` : '-'}
                    </span>
                  </div>
                  {/* 분양가 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>분양가</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.min_price || item.max_price ? '#1d4ed8' : '#9ca3af' }}>
                      {item.min_price || item.max_price
                        ? (item.min_price && item.max_price && item.min_price !== item.max_price
                            ? `${formatWon(item.min_price)} ~ ${formatWon(item.max_price)}`
                            : formatWon((item.min_price ?? item.max_price)!))
                        : '문의'}
                    </span>
                  </div>
                  {/* 계약방식 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, minWidth: 52, flexShrink: 0 }}>계약방식</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>선착순 동·호지정</span>
                  </div>
                  {/* 혜택 */}
                  {item.benefit && (
                    <div style={{ marginTop: 2, fontSize: 12, color: '#059669', fontWeight: 600 }}>🎁 {item.benefit}</div>
                  )}
                </div>
              </div>
            </div>
          </Link>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); updateUrl({ page: p }); }} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9ca3af' : '#374151' }}>
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => { setPage(p); updateUrl({ page: p }); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: page === p ? '#1d4ed8' : '#fff', color: page === p ? '#fff' : '#374151', fontWeight: page === p ? 700 : 400, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {p}
            </button>
          ))}
          <button onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); updateUrl({ page: p }); }} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#9ca3af' : '#374151' }}>
            다음
          </button>
        </div>
      )}
    </>
  );
}
