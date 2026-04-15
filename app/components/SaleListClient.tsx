'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SaleItem, Region } from '@/lib/types';
import KakaoMapList from './KakaoMapList';

const regions: Region[] = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

type FetchType = 'apt' | 'remndr_opt' | 'ofcl_pblpvt';

interface Props {
  initialItems: SaleItem[];
  initialTotal: number;
  dataSource: string;
}

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  '청약예정':  { bg: '#e8f0fe', color: '#1a56db', border: '#bfcffd' },
  '청약중':    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  '당첨발표':  { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  '선착순분양':{ bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  '완판':      { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  '완료':      { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};


function getDDay(receiptStart: string, receiptEnd: string, status: string): { label: string; color: string } | null {
  if (!receiptStart) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(receiptStart); start.setHours(0, 0, 0, 0);
  const end = new Date(receiptEnd); end.setHours(0, 0, 0, 0);

  if (status === '청약중') {
    const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return { label: '오늘 마감', color: '#dc2626' };
    if (diff > 0) return { label: `D-${diff} 마감`, color: '#dc2626' };
  }
  if (status === '청약예정') {
    const diff = Math.ceil((start.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return { label: 'D-Day 오늘', color: '#059669' };
    if (diff > 0) return { label: `D-${diff}`, color: '#059669' };
  }
  return null;
}

function formatPrice(p: number) {
  if (!p) return '-';
  const eok = Math.floor(p / 10000);
  const rest = p % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${rest.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  return `${p.toLocaleString()}만`;
}

export default function SaleListClient({ initialItems, initialTotal, dataSource }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<SaleItem[]>(initialItems);
  const [source, setSource] = useState(dataSource);
  const [loading, setLoading] = useState(false);

  const [region, setRegionState] = useState<Region>((searchParams.get('region') as Region) || '전체');
  const [fetchType, setFetchTypeState] = useState<FetchType>(() => {
    const t = searchParams.get('type');
    if (t === 'officetel' || t === 'pblpvtrent') return 'ofcl_pblpvt';
    if (t === 'remndr' || t === 'opt') return 'remndr_opt';
    return (t as FetchType) || 'apt';
  });

  // 드롭다운 열림 상태
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
      setFavIds(new Set(favs.filter((f: any) => f.type === 'sale').map((f: any) => f.id)));
    } catch {}
  }, []);

  function toggleFav(e: React.MouseEvent, item: SaleItem) {
    e.stopPropagation();
    const favs: any[] = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
    const exists = favs.some(f => f.id === item.id && f.type === 'sale');
    const next = exists
      ? favs.filter(f => !(f.id === item.id && f.type === 'sale'))
      : [...favs, { id: item.id, type: 'sale', name: item.name, location: item.location || item.region, savedAt: new Date().toISOString() }];
    try { localStorage.setItem('mk_favorites', JSON.stringify(next)); } catch {}
    setFavIds(prev => { const s = new Set(prev); exists ? s.delete(item.id) : s.add(item.id); return s; });
  }

  function updateUrl(params: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(params).forEach(([k, v]) => {
      if (v === '전체' || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    window.history.replaceState(null, '', `/?${next.toString()}`);
  }

  function setRegion(v: Region) { setRegionState(v); updateUrl({ region: v }); setOpenDrop(null); }
  function setFetchType(v: FetchType) { setFetchTypeState(v); updateUrl({ type: v }); }

  const fetchItems = useCallback(async (reg: Region, ft: FetchType) => {
    setLoading(true);
    try {
      let merged: SaleItem[] = [];
      let src = 'api';

      const sortByDate = (arr: SaleItem[]) =>
        arr.sort((a, b) => ((b.announcementDate || b.receiptStart || '') > (a.announcementDate || a.receiptStart || '') ? 1 : -1));

      if (ft === 'ofcl_pblpvt') {
        // 오피스텔/도시형 + 공공지원민간임대 병합
        const [r1, r2] = await Promise.all([
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'officetel', perPage: '50' })}`).then(r => r.json()),
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'pblpvtrent', perPage: '50' })}`).then(r => r.json()),
        ]);
        merged = sortByDate([...(r1.items || []), ...(r2.items || [])]);
        src = r1.source || r2.source;
      } else if (ft === 'remndr_opt') {
        // 잔여세대(선착순) + 임의공급(무순위) 병합
        const [r1, r2] = await Promise.all([
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'remndr', perPage: '50' })}`).then(r => r.json()),
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'opt', perPage: '50' })}`).then(r => r.json()),
        ]);
        merged = sortByDate([...(r1.items || []), ...(r2.items || [])]);
        src = r1.source || r2.source;
      } else {
        const params = new URLSearchParams({ region: reg, type: ft, perPage: '50' });
        const data = await fetch(`/api/sale?${params}`).then(r => r.json());
        merged = data.items || [];
        src = data.source;
      }

      setItems(merged);
      setSource(src);
    } catch { /* keep existing */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(region, fetchType); setDisplayCount(20); }, [region, fetchType, fetchItems]);

  const filtered = search.trim()
    ? items.filter(i => i.name.includes(search.trim()) || i.location.includes(search.trim()))
    : items;

  const fetchTypeLabels: Record<FetchType, { full: string; short: string }> = {
    apt:        { full: '아파트',                          short: '아파트' },
    remndr_opt: { full: '아파트잔여세대',                  short: '잔여세대' },
    ofcl_pblpvt:{ full: '오피스텔/도시형/(공공지원)민간임대', short: '오피스텔/민간임대' },
  };

  const isLive = source === 'api';

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 상단 모집유형 탭 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {(['apt', 'remndr_opt', 'ofcl_pblpvt'] as FetchType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => setFetchType(ft)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: fetchType === ft ? '2px solid #1d4ed8' : '2px solid transparent',
                  color: fetchType === ft ? '#1d4ed8' : '#6b7280',
                }}
              >
                {fetchTypeLabels[ft].full}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
        {/* 검색 + 지역 필터 + 뷰 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="단지명·주소 검색"
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13,
              border: '1px solid #e5e7eb', background: '#fff', outline: 'none',
              width: 180, color: '#374151',
            }}
          />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenDrop(openDrop === 'region' ? null : 'region')}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
                color: region !== '전체' ? '#1d4ed8' : '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              지역: {region} <span style={{ fontSize: 10 }}>▼</span>
            </button>
            {openDrop === 'region' && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, background: '#fff',
                border: '1px solid #e5e7eb', borderRadius: 10, padding: 12,
                zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, minWidth: 260,
              }}>
                {regions.map((r) => (
                  <button key={r} onClick={() => setRegion(r)} style={{
                    padding: '5px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: region === r ? '#1d4ed8' : '#f3f4f6',
                    color: region === r ? '#fff' : '#374151',
                  }}>{r}</button>
                ))}
              </div>
            )}
          </div>
          {/* 뷰 토글 버튼 */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '7px 12px', borderRadius: '8px 0 0 8px', fontSize: 13, fontWeight: 600,
                border: '1px solid #e5e7eb', cursor: 'pointer',
                background: viewMode === 'list' ? '#1d4ed8' : '#fff',
                color: viewMode === 'list' ? '#fff' : '#6b7280',
              }}
            >≡ 목록</button>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '7px 12px', borderRadius: '0 8px 8px 0', fontSize: 13, fontWeight: 600,
                border: '1px solid #e5e7eb', borderLeft: 'none', cursor: 'pointer',
                background: viewMode === 'map' ? '#1d4ed8' : '#fff',
                color: viewMode === 'map' ? '#fff' : '#6b7280',
              }}
            >📍 지도</button>
          </div>
        </div>

        {/* 건수 + 데이터 소스 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            총 <strong style={{ color: '#1d4ed8' }}>{filtered.length}</strong>건
            {loading && <span style={{ marginLeft: 8, color: '#aaa', fontSize: 12 }}>불러오는 중...</span>}
          </span>
          {isLive ? (
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 20,
              background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              실시간 공공데이터
            </span>
          ) : (
            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              샘플 데이터
            </span>
          )}
          <button
            onClick={() => fetchItems(region, fetchType)}
            disabled={loading}
            style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
          >
            ↻ 새로고침
          </button>
        </div>

        {/* 지도뷰 */}
        {viewMode === 'map' && !loading && (
          <KakaoMapList items={filtered} />
        )}

        {/* 목록뷰 */}
        {viewMode === 'list' && (
          loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height: 96, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', opacity: 0.6 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              조건에 맞는 분양 정보가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.slice(0, displayCount).map((item) => {
                const ss = statusStyle[item.status] || statusStyle['완료'];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      try { sessionStorage.setItem(`sale_item_${item.id}`, JSON.stringify(item)); } catch {}
                      router.push(`/sale/${item.id}`);
                    }}
                    style={{
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                      display: 'flex', alignItems: 'stretch', overflow: 'hidden',
                      transition: 'box-shadow 0.15s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* 정보 */}
                    <div style={{ flex: 1, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`,
                        }}>{item.status}</span>
                        {(() => { const d = getDDay(item.receiptStart, item.receiptEnd, item.status); return d ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: d.color, color: '#fff' }}>{d.label}</span>
                        ) : null; })()}
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#1d4ed8' }}>{item.name}</span>
                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 7px', borderRadius: 6 }}>{item.buildingType}</span>
                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 7px', borderRadius: 6 }}>{item.supplyType}</span>
                        {item.recruitType === '선착순' && (
                          <span style={{ fontSize: 11, background: '#fff0f6', color: '#c026d3', padding: '2px 7px', borderRadius: 6, border: '1px solid #f9a8d4' }}>선착순</span>
                        )}
                        <button
                          onClick={e => toggleFav(e, item)}
                          title={favIds.has(item.id) ? '관심 단지 해제' : '관심 단지 저장'}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: favIds.has(item.id) ? '#f59e0b' : '#d1d5db', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                        >
                          {favIds.has(item.id) ? '★' : '☆'}
                        </button>
                      </div>

                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                        📍 {item.location}
                      </div>

                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#374151', alignItems: 'center' }}>
                        <span>세대수 <strong>{item.totalUnits.toLocaleString()}세대</strong></span>
                        {item.minPrice > 0 && (
                          <span>분양가 <strong style={{ color: '#1d4ed8' }}>{formatPrice(item.minPrice)}~{formatPrice(item.maxPrice)}</strong></span>
                        )}
                        <span>접수 <strong>{item.receiptStart} ~ {item.receiptEnd}</strong></span>
                        {item.winnerDate && <span>당첨발표 <strong>{item.winnerDate}</strong></span>}
                      </div>
                    </div>

                    {/* 우측 공고일 */}
                    <div style={{
                      width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #f3f4f6',
                      padding: '12px 8px', color: '#9ca3af', fontSize: 11, textAlign: 'center',
                    }}>
                      <span>공고일</span>
                      <span style={{ fontWeight: 600, color: '#374151', marginTop: 2 }}>
                        {item.announcementDate || '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 더보기 버튼 (목록뷰 only) */}
        {viewMode === 'list' && !loading && filtered.length > displayCount && (
          <button
            onClick={() => setDisplayCount(c => c + 20)}
            style={{
              marginTop: 8, width: '100%', padding: '14px', borderRadius: 12,
              border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: '#1d4ed8',
            }}
          >
            더보기 ({displayCount}/{filtered.length})
          </button>
        )}
      </div>

      {/* 드롭다운 외부 클릭 닫기 */}
      {openDrop && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          onClick={() => setOpenDrop(null)}
        />
      )}
    </div>
  );
}
