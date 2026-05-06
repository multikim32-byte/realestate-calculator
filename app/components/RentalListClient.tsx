'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { type LhRentalItem } from '@/lib/lhApi';

function rentalDetailHref(item: LhRentalItem): string {
  const sp = new URLSearchParams();
  if (item.ccrCnntSysDsCd) sp.set('ccrCd', item.ccrCnntSysDsCd);
  if (item.uppAisTpCd)      sp.set('uppTpCd', item.uppAisTpCd);
  if (item.aisTpCd)         sp.set('aisTpCd', item.aisTpCd);
  const qs = sp.toString();
  return `/rental/${item.id}${qs ? `?${qs}` : ''}`;
}

function saveItem(item: LhRentalItem) {
  try { sessionStorage.setItem(`rental_item_${item.id}`, JSON.stringify(item)); } catch {}
}

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const RENTAL_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  '행복주택':     { bg: '#e0f2fe', color: '#0369a1' },
  '국민임대':     { bg: '#d1fae5', color: '#065f46' },
  '통합공공임대': { bg: '#ede9fe', color: '#5b21b6' },
  '장기전세':     { bg: '#fef3c7', color: '#92400e' },
  '영구임대':     { bg: '#fce7f3', color: '#9d174d' },
  '공공임대':     { bg: '#f3f4f6', color: '#374151' },
  '매입임대':     { bg: '#fff7ed', color: '#c2410c' },
  '전세임대':     { bg: '#ecfdf5', color: '#047857' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  '모집예정': { bg: '#e8f0fe', color: '#1a56db', border: '#bfcffd' },
  '모집중':   { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  '모집마감': { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

function getDDay(start: string, end: string, status: string): { label: string; color: string } | null {
  if (!start) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);

  if (status === '모집중') {
    const diff = Math.ceil((e.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return { label: '오늘 마감', color: '#dc2626' };
    if (diff > 0) return { label: `D-${diff} 마감`, color: '#dc2626' };
  }
  if (status === '모집예정') {
    const diff = Math.ceil((s.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return { label: 'D-Day', color: '#059669' };
    if (diff > 0) return { label: `D-${diff}`, color: '#059669' };
  }
  return null;
}

interface Props {
  initialItems: LhRentalItem[];
  initialTotal: number;
  dataSource: string;
}

export default function RentalListClient({ initialItems, initialTotal, dataSource }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<LhRentalItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(searchParams.get('region') || '전체');
  const [openDrop, setOpenDrop] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const fetchData = useCallback(async (r: string, p: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ region: r, page: String(p), perPage: String(perPage) });
      const res = await fetch(`/api/rental?${qs}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (page === 1 && region === (searchParams.get('region') || '전체')) return;
    fetchData(region, page);
  }, [region, page, fetchData, searchParams]);

  function handleRegion(r: string) {
    setRegion(r);
    setPage(1);
    const qs = r !== '전체' ? `?region=${r}` : '';
    router.replace(`/rental${qs}`, { scroll: false });
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      {/* 데이터 출처 표시 */}
      {dataSource !== 'api' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
          {dataSource === 'mock' ? '🧪 테스트 데이터로 표시 중 (API 키 미설정)' : '⚠️ API 연결 실패 — 샘플 데이터로 표시 중'}
        </div>
      )}

      {/* 지역 필터 */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
        <button
          onClick={() => setOpenDrop(v => !v)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
            color: region !== '전체' ? '#1d4ed8' : '#374151',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          지역: {region} <span style={{ fontSize: 10 }}>▼</span>
        </button>
        {openDrop && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 10, padding: 12,
            zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, minWidth: 260,
          }}>
            {REGIONS.map(r => (
              <button key={r} onClick={() => { handleRegion(r); setOpenDrop(false); }} style={{
                padding: '5px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: region === r ? '#1d4ed8' : '#f3f4f6',
                color: region === r ? '#fff' : '#374151',
              }}>{r}</button>
            ))}
          </div>
        )}
      </div>

      {/* 결과 수 */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
        총 <strong style={{ color: '#111' }}>{total.toLocaleString()}</strong>건
        {loading && <span style={{ marginLeft: 8, color: '#9ca3af' }}>불러오는 중…</span>}
      </div>

      {/* 카드 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>해당 지역 임대공고가 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {items.map((item) => {
            const typeStyle = RENTAL_TYPE_COLORS[item.rentalType] ?? { bg: '#f3f4f6', color: '#374151' };
            const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE['모집마감'];
            const dday = getDDay(item.receiptStart, item.receiptEnd, item.status);

            return (
              <Link
                key={item.id}
                href={rentalDetailHref(item)}
                onClick={() => saveItem(item)}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  padding: '18px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#93c5fd'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#e5e7eb'; }}
              >
                {/* 상단 뱃지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
                  }}>
                    {item.status}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: typeStyle.bg, color: typeStyle.color,
                  }}>
                    {item.rentalType}
                  </span>
                  {dday && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: dday.color }}>
                      {dday.label}
                    </span>
                  )}
                </div>

                {/* 공고명 */}
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a5f', lineHeight: 1.4 }}>
                    {item.name}
                  </h3>
                  {item.location && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                      📍 {item.location}
                    </p>
                  )}
                </div>

                {/* 세대수 — 데이터 있을 때만 표시 */}
                {item.totalUnits > 0 && (
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    🏠 총 <strong>{item.totalUnits.toLocaleString()}</strong>세대
                  </div>
                )}

                {/* 일정 */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {item.receiptStart && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      📅 접수 <strong style={{ color: '#111' }}>{item.receiptStart}</strong>
                      {item.receiptEnd && <> ~ <strong style={{ color: '#111' }}>{item.receiptEnd}</strong></>}
                    </div>
                  )}
                  {item.winnerDate && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      🎯 발표 <strong style={{ color: '#111' }}>{item.winnerDate}</strong>
                    </div>
                  )}
                  {item.moveInDate && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      🚚 입주 <strong style={{ color: '#111' }}>{item.moveInDate.slice(0, 7)}</strong>
                    </div>
                  )}
                </div>

              </Link>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: page <= 1 ? '#f9fafb' : '#fff', color: page <= 1 ? '#d1d5db' : '#374151', cursor: page <= 1 ? 'default' : 'pointer', fontSize: 13 }}
          >
            이전
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid',
                  background: page === p ? '#1d4ed8' : '#fff',
                  color: page === p ? '#fff' : '#374151',
                  borderColor: page === p ? '#1d4ed8' : '#e5e7eb',
                  fontWeight: page === p ? 700 : 400,
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: page >= totalPages ? '#f9fafb' : '#fff', color: page >= totalPages ? '#d1d5db' : '#374151', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: 13 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
