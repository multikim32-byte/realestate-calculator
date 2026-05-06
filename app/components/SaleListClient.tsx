'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SaleItem, Region } from '@/lib/types';
import KakaoMapList from './KakaoMapList';

const regions: Region[] = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

type FetchType = 'apt' | 'remndr_opt' | 'ofcl_pblpvt';
type ViewMode = 'card' | 'list' | 'map';

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
  '청약마감':  { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
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
  if (eok > 0 && rest > 0) return `${eok}억 ${Math.round(rest / 100) * 100 > 0 ? `${(rest / 1000).toFixed(1)}천` : ''}만`;
  if (eok > 0) return `${eok}억`;
  return `${p.toLocaleString()}만`;
}

function formatPriceCard(p: number) {
  if (!p) return '-';
  const eok = Math.floor(p / 10000);
  const rest = p % 10000;
  const chun = Math.floor(rest / 1000);
  const baek = Math.round((rest % 1000) / 100) * 100;
  let s = '';
  if (eok > 0) s += `${eok}억 `;
  if (chun > 0) s += `${chun}천`;
  if (baek > 0) s += `${baek}`;
  if (s.endsWith(' ')) s = s.trim();
  return s ? s + '만원' : '-';
}

function extractSigungu(location: string): string {
  const parts = location.split(/\s+/);
  for (let i = 1; i < parts.length; i++) {
    if (/[시군구]$/.test(parts[i])) return parts[i];
  }
  return parts[1] || parts[0] || location;
}

function getCardStatusBadge(item: SaleItem): { label: string; bg: string; color: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (item.status === '청약예정' && item.receiptStart) {
    const diff = Math.ceil((new Date(item.receiptStart).getTime() - today.getTime()) / 86400000);
    if (diff <= 7) return { label: '청약임박', bg: '#fef3c7', color: '#92400e' };
    return { label: '예정', bg: '#dbeafe', color: '#1d4ed8' };
  }
  if (item.status === '청약중') return { label: '청약중', bg: '#d1fae5', color: '#065f46' };
  if (item.status === '당첨발표') return { label: '발표', bg: '#fef3c7', color: '#92400e' };
  if (item.status === '선착순분양') return { label: '선착순', bg: '#fce7f3', color: '#9d174d' };
  if (item.status === '완판') return { label: '완판', bg: '#f3f4f6', color: '#6b7280' };
  return { label: item.status, bg: '#f3f4f6', color: '#6b7280' };
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

  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
      setFavIds(new Set(favs.filter((f: any) => f.type === 'sale').map((f: any) => f.id)));
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/sale-content/thumbnails')
      .then(r => r.json())
      .then(data => setThumbnailMap(data ?? {}))
      .catch(() => {});
  }, []);

  function toggleFav(e: React.MouseEvent, item: SaleItem) {
    e.stopPropagation();
    const favs: any[] = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
    const exists = favs.some(f => f.id === item.id && f.type === 'sale');
    const next = exists
      ? favs.filter(f => !(f.id === item.id && f.type === 'sale'))
      : [...favs, { id: item.id, type: 'sale', name: item.name, location: item.location || item.region, savedAt: new Date().toISOString(), receiptStart: item.receiptStart }];
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
        const [r1, r2] = await Promise.all([
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'officetel', perPage: '100' })}`).then(r => r.json()),
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'pblpvtrent', perPage: '100' })}`).then(r => r.json()),
        ]);
        merged = sortByDate([...(r1.items || []), ...(r2.items || [])]);
        src = r1.source || r2.source;
      } else if (ft === 'remndr_opt') {
        const [r1, r2] = await Promise.all([
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'remndr', perPage: '100' })}`).then(r => r.json()),
          fetch(`/api/sale?${new URLSearchParams({ region: reg, type: 'opt', perPage: '100' })}`).then(r => r.json()),
        ]);
        merged = sortByDate([...(r1.items || []), ...(r2.items || [])]);
        src = r1.source || r2.source;
      } else {
        const params = new URLSearchParams({ region: reg, type: ft, perPage: '100' });
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

  const fetchTypeLabels: Record<FetchType, string> = {
    apt:         '아파트',
    remndr_opt:  '아파트잔여세대',
    ofcl_pblpvt: '오피스텔/도시형/(공공지원)민간임대',
  };

  const isLive = source === 'api';

  function handleCardClick(item: SaleItem) {
    try { sessionStorage.setItem(`sale_item_${item.id}`, JSON.stringify(item)); } catch {}
    router.push(`/sale/${item.id}`);
  }

  // ── 카드 그리드 렌더 ──────────────────────────────────────────────────
  function renderCards() {
    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
    };
    if (loading) {
      return (
        <div style={gridStyle}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ height: 210, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', opacity: 0.5 }} />
          ))}
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          조건에 맞는 분양 정보가 없습니다.
        </div>
      );
    }
    return (
      <>
        <style>{`
          .sale-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
          @media (max-width: 1279px) { .sale-card-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 767px)  { .sale-card-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 479px)  { .sale-card-grid { grid-template-columns: repeat(1, 1fr); } }
        `}</style>
      <div className="sale-card-grid">
        {filtered.slice(0, displayCount).map(item => {
          const badge = getCardStatusBadge(item);
          const sigungu = extractSigungu(item.location);
          const isFav = favIds.has(item.id);
          const thumbnail = thumbnailMap[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                gap: 0, transition: 'box-shadow 0.15s, transform 0.12s', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {/* 썸네일 이미지 */}
              {thumbnail && (
                <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={thumbnail}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 상단: 사업주체 + 배지 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, lineHeight: 1.4, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(item as any).businessEntity || item.constructionCompany || ''}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {badge.label}
                </span>
              </div>

              {/* 단지명 */}
              <div style={{
                fontSize: 15, fontWeight: 800, color: '#1e293b', lineHeight: 1.35,
                marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {item.name}
              </div>

              {/* 지역 + 주택형 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>📍 {sigungu}</span>
                <span style={{
                  fontSize: 11, padding: '2px 7px', borderRadius: 6,
                  background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
                }}>{item.buildingType}</span>
              </div>

              {/* 구분선 */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, marginBottom: 4 }}>
                {/* 분양가 */}
                {item.minPrice > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>분양가</span>
                    <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>
                      {formatPriceCard(item.minPrice)} ~ {formatPriceCard(item.maxPrice)}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>분양가</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>미정</span>
                  </div>
                )}

                {/* 총 세대 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>총 세대</span>
                  <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>{item.totalUnits.toLocaleString()}세대</span>
                </div>
              </div>

              {/* 청약기간 + 즐겨찾기 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {item.receiptStart ? `📅 ${item.receiptStart} ~ ${item.receiptEnd}` : '-'}
                </span>
                <button
                  onClick={e => toggleFav(e, item)}
                  title={isFav ? '관심 단지 해제' : '관심 단지 저장'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: isFav ? '#f59e0b' : '#d1d5db', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                >
                  {isFav ? '★' : '☆'}
                </button>
              </div>
              </div>{/* padding wrapper 닫기 */}
            </div>
          );
        })}
      </div>
      </>
    );
  }

  // ── 리스트 렌더 ──────────────────────────────────────────────────────
  function renderList() {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 96, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', opacity: 0.6 }} />
          ))}
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          조건에 맞는 분양 정보가 없습니다.
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.slice(0, displayCount).map((item) => {
          const ss = statusStyle[item.status] || statusStyle['완료'];
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                display: 'flex', alignItems: 'stretch', overflow: 'hidden',
                transition: 'box-shadow 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
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
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>📍 {item.location}</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#374151', alignItems: 'center' }}>
                  <span>세대수 <strong>{item.totalUnits.toLocaleString()}세대</strong></span>
                  {item.minPrice > 0 && (
                    <span>분양가 <strong style={{ color: '#1d4ed8' }}>{formatPrice(item.minPrice)}~{formatPrice(item.maxPrice)}</strong></span>
                  )}
                  <span>접수 <strong>{item.receiptStart} ~ {item.receiptEnd}</strong></span>
                  {item.winnerDate && <span>당첨발표 <strong>{item.winnerDate}</strong></span>}
                </div>
              </div>
              <div style={{
                width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #f3f4f6',
                padding: '12px 8px', color: '#9ca3af', fontSize: 11, textAlign: 'center',
              }}>
                <span>공고일</span>
                <span style={{ fontWeight: 600, color: '#374151', marginTop: 2 }}>{item.announcementDate || '-'}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 상단 모집유형 탭 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {(['apt', 'remndr_opt', 'ofcl_pblpvt'] as FetchType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => setFetchType(ft)}
                style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: fetchType === ft ? '2px solid #1d4ed8' : '2px solid transparent',
                  color: fetchType === ft ? '#1d4ed8' : '#6b7280',
                }}
              >
                {fetchTypeLabels[ft]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px' }}>
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

          {/* 뷰 토글 */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 0 }}>
            {([['card', '⊞ 카드'], ['list', '≡ 목록'], ['map', '📍 지도']] as [ViewMode, string][]).map(([mode, label], idx) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  borderLeft: idx > 0 ? 'none' : '1px solid #e5e7eb',
                  borderRadius: idx === 0 ? '8px 0 0 8px' : idx === 2 ? '0 8px 8px 0' : 0,
                  background: viewMode === mode ? '#1d4ed8' : '#fff',
                  color: viewMode === mode ? '#fff' : '#6b7280',
                }}
              >
                {label}
              </button>
            ))}
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
        {viewMode === 'map' && !loading && <KakaoMapList items={filtered} />}

        {/* 카드뷰 */}
        {viewMode === 'card' && renderCards()}

        {/* 목록뷰 */}
        {viewMode === 'list' && renderList()}

        {/* 더보기 */}
        {viewMode !== 'map' && !loading && filtered.length > displayCount && (
          <button
            onClick={() => setDisplayCount(c => c + 20)}
            style={{
              marginTop: 14, width: '100%', padding: '14px', borderRadius: 12,
              border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: '#1d4ed8',
            }}
          >
            더보기 ({displayCount}/{filtered.length})
          </button>
        )}
      </div>

      {openDrop && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpenDrop(null)} />
      )}
    </div>
  );
}
