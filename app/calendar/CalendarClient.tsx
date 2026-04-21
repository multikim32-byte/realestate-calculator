'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { PublicSaleItem } from '@/lib/publicDataApi';

const REGIONS = [
  '전체', '서울', '경기', '인천', '부산', '대구', '광주',
  '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startOffset(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getEventStyle(item: PublicSaleItem): { label: string; bg: string; color: string; border?: string } {
  if (item.recruitType === '선착순') {
    return { label: '특', bg: '#f97316', color: '#fff' };
  }
  if (item.buildingType === '아파트') {
    return { label: '아', bg: '#3b82f6', color: '#fff' };
  }
  if (item.buildingType === '오피스텔') {
    return { label: '오', bg: '#8b5cf6', color: '#fff' };
  }
  if (item.buildingType === '도시형생활주택') {
    return { label: '도', bg: '#10b981', color: '#fff' };
  }
  return { label: '기', bg: '#6b7280', color: '#fff' };
}

export default function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [region, setRegion] = useState('전체');
  const [items, setItems] = useState<PublicSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [openDrop, setOpenDrop] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sale?perPage=100&type=all');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const monthStr = `${year}-${pad2(month + 1)}`;
  const monthFirstDay = `${monthStr}-01`;

  const visible = items.filter(item => {
    if (region !== '전체' && item.region !== region) return false;
    const s = item.receiptStart;
    const e = item.receiptEnd || '9999-12-31';
    if (!s) return false;
    return s.startsWith(monthStr) || (s < monthFirstDay && e >= monthFirstDay);
  });

  const byDay: Record<number, PublicSaleItem[]> = {};
  visible.forEach(item => {
    if (item.receiptStart?.startsWith(monthStr)) {
      const d = parseInt(item.receiptStart.slice(8, 10));
      (byDay[d] ??= []).push(item);
    }
  });

  const ongoing = visible.filter(item => item.receiptStart && !item.receiptStart.startsWith(monthStr));

  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const selectedItems = selectedDay ? (byDay[selectedDay] ?? []) : [];
  const totalDays = daysInMonth(year, month);
  const offset = startOffset(year, month);

  return (
    <>
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
              <button key={r} onClick={() => { setRegion(r); setSelectedDay(null); setOpenDrop(false); }} style={{
                padding: '5px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: region === r ? '#1d4ed8' : '#f3f4f6',
                color: region === r ? '#fff' : '#374151',
              }}>{r}</button>
            ))}
          </div>
        )}
      </div>

      {/* 월 탐색 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
          ← 이전달
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: 0 }}>
          {year}년 {MONTH_NAMES[month]}
        </h2>
        <button onClick={nextMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
          다음달 →
        </button>
      </div>

      {/* 범례 */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: '아', color: '#3b82f6', name: '아파트' },
            { label: '오', color: '#8b5cf6', name: '오피스텔' },
            { label: '도', color: '#10b981', name: '도시형' },
            { label: '특', color: '#f97316', name: '선착순/특별' },
          ].map(({ label, color, name }) => (
            <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: color,
                color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{label}</span>
              {name}
            </span>
          ))}
          <span style={{ fontSize: 12, color: '#9ca3af' }}>· 항목 클릭 시 상세 페이지로 이동</span>
        </div>
      )}

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {DAY_NAMES.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', padding: isMobile ? '6px 2px' : '8px 4px',
            fontSize: isMobile ? 11 : 12, fontWeight: 600,
            color: i === 5 ? '#3b82f6' : i === 6 ? '#ef4444' : '#374151',
            background: '#f9fafb', borderRadius: 4,
          }}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e${i}`} style={{
            background: '#fafafa',
            border: '1px solid #f3f4f6',
            minHeight: isMobile ? 52 : 110,
            borderRadius: 4,
          }} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const d = i + 1;
          const dayItems = byDay[d] ?? [];
          const hasItems = dayItems.length > 0;
          const isSel = selectedDay === d;
          const today_ = isToday(d);
          const colPos = (offset + i) % 7;
          const isSat = colPos === 5;
          const isSun = colPos === 6;

          return (
            <div
              key={d}
              onClick={() => hasItems && setSelectedDay(isSel ? null : d)}
              style={{
                minHeight: isMobile ? 52 : 110,
                display: 'flex',
                flexDirection: 'column',
                padding: isMobile ? '4px 2px' : '6px 4px',
                background: isSel ? '#eff6ff' : '#fff',
                border: `1px solid ${isSel ? '#93c5fd' : '#e5e7eb'}`,
                borderRadius: 4,
                cursor: hasItems ? 'pointer' : 'default',
                overflow: 'hidden',
              }}
            >
              {/* 날짜 숫자 */}
              <div style={{
                width: isMobile ? 20 : 24,
                height: isMobile ? 20 : 24,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 11 : 13,
                fontWeight: today_ ? 700 : 400,
                background: today_ ? '#1d4ed8' : 'transparent',
                color: today_ ? '#fff' : isSat ? '#3b82f6' : isSun ? '#ef4444' : '#374151',
                marginBottom: 3, flexShrink: 0, alignSelf: 'flex-start',
              }}>{d}</div>

              {/* PC: 이벤트 목록 */}
              {!isMobile && hasItems && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'hidden' }}>
                  {dayItems.slice(0, 4).map((item, idx) => {
                    const s = getEventStyle(item);
                    return (
                      <Link
                        key={idx}
                        href={`/sale/${item.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: s.bg, borderRadius: 3,
                          padding: '2px 4px', textDecoration: 'none',
                          overflow: 'hidden', flexShrink: 0,
                        }}
                      >
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: s.color,
                          background: 'rgba(0,0,0,0.15)', borderRadius: '50%',
                          width: 14, height: 14, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{s.label}</span>
                        <span style={{
                          fontSize: 10, color: '#fff', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1,
                        }}>{item.name}</span>
                      </Link>
                    );
                  })}
                  {dayItems.length > 4 && (
                    <span style={{ fontSize: 10, color: '#6b7280', paddingLeft: 2 }}>
                      +{dayItems.length - 4}건 더보기
                    </span>
                  )}
                </div>
              )}

              {/* Mobile: 총 N건 */}
              {isMobile && hasItems && (
                <div style={{
                  fontSize: 11, color: '#1d4ed8', fontWeight: 700,
                  textAlign: 'center', marginTop: 2,
                }}>
                  총{dayItems.length}건
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          청약 일정을 불러오는 중...
        </div>
      )}

      {/* 선택된 날짜 상세 (모바일용 / PC에서 +N더보기 클릭 시) */}
      {!loading && selectedDay !== null && selectedItems.length > 0 && (
        <div style={{ marginTop: 16, padding: 20, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', marginBottom: 12 }}>
            {month + 1}월 {selectedDay}일 청약 시작 ({selectedItems.length}건)
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* 진행 중인 청약 */}
      {!loading && ongoing.length > 0 && (
        <div style={{ marginTop: 16, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 12 }}>
            이번 달 진행 중인 청약 ({ongoing.length}건)
          </h3>
          <div style={{ display: 'grid', gap: 0 }}>
            {ongoing.map((item, idx) => {
              const s = getEventStyle(item);
              return (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: 6, padding: '10px 0',
                  borderBottom: idx < ongoing.length - 1 ? '1px solid #d1fae5' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{
                      flexShrink: 0, fontSize: 11, padding: '2px 7px', borderRadius: 10,
                      background: s.bg, color: '#fff',
                    }}>{item.buildingType}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>~ {item.receiptEnd}</span>
                    <Link href={`/sale/${item.id}`} style={{ fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>상세</Link>
                    {item.pblancUrl && (
                      <a href={item.pblancUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#059669', textDecoration: 'none' }}>
                        청약홈↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 데이터 없음 */}
      {!loading && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>{MONTH_NAMES[month]} 청약 일정이 없습니다.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>이전 달이나 다음 달을 확인해보세요.</p>
        </div>
      )}
    </>
  );
}

function ItemCard({ item }: { item: PublicSaleItem }) {
  const s = getEventStyle(item);
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #dbeafe' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.bg, color: '#fff' }}>
              {item.buildingType}
            </span>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{item.region}</span>
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{item.name}</h4>
          <p style={{ fontSize: 13, color: '#6b7280' }}>{item.location}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>청약기간</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f' }}>
            {item.receiptStart} ~ {item.receiptEnd}
          </div>
          {item.winnerDate && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>당첨발표 {item.winnerDate}</div>
          )}
          {item.totalUnits > 0 && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>총 {item.totalUnits.toLocaleString()}세대</div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/sale/${item.id}`} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, background: '#1d4ed8', color: '#fff', textDecoration: 'none' }}>
          상세보기
        </Link>
        {item.pblancUrl && (
          <a href={item.pblancUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid #1d4ed8', color: '#1d4ed8', textDecoration: 'none' }}>
            청약홈 바로가기 →
          </a>
        )}
      </div>
    </div>
  );
}
