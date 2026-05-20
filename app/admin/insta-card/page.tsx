'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/app/admin/components/AdminHeader';
import InstaCard, { type SaleItem, type UnsoldItem, type TradeStats, type CardType } from './InstaCard';

const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const PER_PAGE = 5;
const MAX_PAGES = 3;

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push({ value: `${y}-${m}`, label: `${y}년 ${m}월` });
  }
  return options;
}

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    label: `${fmt(monday)}(월) ~ ${fmt(sunday)}(일)`,
  };
}

const CARD_TYPES: { key: CardType; label: string; desc: string }[] = [
  { key: '오늘의청약', label: '📅 오늘의 청약',   desc: '현재 진행·7일 이내 예정' },
  { key: '이번주청약', label: '📆 이번주 청약',   desc: '이번주 청약 일정 (월~일)' },
  { key: '청약일정',   label: '📋 월별 청약',     desc: '월별 청약 일정' },
  { key: '미분양',     label: '🏢 미분양',         desc: '활성 미분양 매물' },
  { key: '급등TOP10',  label: '📈 급등 TOP 10',   desc: '전월/전주 대비 급등' },
  { key: '급락TOP10',  label: '📉 급락 TOP 10',   desc: '전월/전주 대비 급락' },
  { key: '신고가TOP10', label: '🏆 신고가 TOP 10', desc: '이번달/이번주 최고가' },
  { key: '거래량TOP10', label: '🔥 거래량 TOP 10', desc: '이번달/이번주 거래 많은 단지' },
];

const TRADE_TYPES: CardType[] = ['급등TOP10', '급락TOP10', '신고가TOP10', '거래량TOP10'];

export default function InstaCardPage() {
  const router = useRouter();
  const [cardType, setCardType] = useState<CardType>('오늘의청약');
  const [region, setRegion] = useState('전국');
  const monthOptions = getMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);
  const [tradePeriod, setTradePeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<UnsoldItem[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const isTrade = TRADE_TYPES.includes(cardType);
  const week = getWeekRange();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const SCALE = isMobile
    ? Math.min(0.55, (typeof window !== 'undefined' ? window.innerWidth - 40 : 320) / 1080)
    : 0.55;

  // 실거래 통계 fetch
  useEffect(() => {
    if (!isTrade) return;
    setLoading(true);
    setTradeStats(null);
    fetch(`/api/admin/trade-stats?period=${tradePeriod}`)
      .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
      .then(data => { if (data !== null) setTradeStats(data); })
      .catch(() => setTradeStats(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrade, tradePeriod]);

  // 청약/미분양 fetch
  useEffect(() => {
    if (isTrade) return;
    setCurrentPage(1);
    setLoading(true);

    if (cardType === '미분양') {
      fetch('/api/admin/unsold')
        .then(r => { if (r.status === 401) { router.push('/admin'); return null; } return r.json(); })
        .then(data => {
          if (!data) return;
          setUnsoldItems((data as UnsoldItem[]).filter(item =>
            region === '전국' || item.location?.includes(region)
          ));
        })
        .catch(() => setUnsoldItems([]))
        .finally(() => setLoading(false));
    } else {
      fetch('/api/sale?type=all&perPage=100')
        .then(r => r.json())
        .then(data => {
          const today = new Date().toISOString().slice(0, 10);
          const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
          const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

          if (cardType === '오늘의청약') {
            const classified = (data.items ?? [])
              .filter((item: SaleItem) => {
                if (!item.receiptStart || !item.receiptEnd) return false;
                const ongoing = item.receiptStart <= today && item.receiptEnd >= today;
                const upcoming = item.receiptStart > today && item.receiptStart <= in7;
                return (ongoing || upcoming) && (region === '전국' || item.location?.includes(region));
              })
              .map((item: SaleItem): SaleItem => ({
                ...item,
                statusLabel: item.receiptEnd <= in3 ? '마감임박'
                  : item.receiptStart <= today ? '청약중' : '청약예정',
              }))
              .sort((a: SaleItem, b: SaleItem) => {
                const order: Record<string, number> = { '마감임박': 0, '청약중': 1, '청약예정': 2 };
                return (order[a.statusLabel ?? ''] ?? 3) - (order[b.statusLabel ?? ''] ?? 3);
              });
            setSaleItems(classified);

          } else if (cardType === '이번주청약') {
            const classified = (data.items ?? [])
              .filter((item: SaleItem) => {
                if (!item.receiptStart || !item.receiptEnd) return false;
                const overlap = item.receiptStart <= week.end && item.receiptEnd >= week.start;
                return overlap && (region === '전국' || item.location?.includes(region));
              })
              .map((item: SaleItem): SaleItem => {
                let statusLabel: string;
                if (item.receiptStart <= today && item.receiptEnd <= in3) statusLabel = '마감임박';
                else if (item.receiptStart <= today) statusLabel = '청약중';
                else statusLabel = '청약예정';
                return { ...item, statusLabel };
              })
              .sort((a: SaleItem, b: SaleItem) => {
                const order: Record<string, number> = { '마감임박': 0, '청약중': 1, '청약예정': 2 };
                return (order[a.statusLabel ?? ''] ?? 3) - (order[b.statusLabel ?? ''] ?? 3);
              });
            setSaleItems(classified);

          } else {
            setSaleItems((data.items ?? []).filter((item: SaleItem) => {
              if (!item.receiptStart) return false;
              return item.receiptStart.startsWith(month) &&
                (region === '전국' || item.location?.includes(region));
            }));
          }
        })
        .catch(() => setSaleItems([]))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, region, month, router, isTrade]);

  const allItems = cardType === '미분양' ? unsoldItems : saleItems;
  const totalCount = isTrade ? (tradeStats ? 10 : 0) : allItems.length;
  const totalPages = isTrade ? 1 : Math.min(MAX_PAGES, Math.ceil(totalCount / PER_PAGE));

  const openFullView = () => {
    const params = new URLSearchParams({
      type: cardType, region, month,
      period: tradePeriod,
      page: String(currentPage),
    });
    window.open(`/admin/insta-card/view?${params}`, '_blank', 'width=1120,height=1180');
  };

  const cardW = Math.round(1080 * SCALE);
  const cardH = Math.round(1080 * SCALE);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminHeader />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 20px' }}>
        <h1 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>인스타 카드 생성</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>카드 유형 선택 → 미리보기 확인 → 새 창에서 캡처</p>

        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 32, alignItems: 'flex-start',
        }}>

          {/* 필터 패널 */}
          <div style={{
            width: isMobile ? '100%' : 240,
            background: '#fff', borderRadius: 16,
            padding: isMobile ? '16px' : '20px',
            border: '1px solid #e5e7eb', flexShrink: 0,
            boxSizing: 'border-box',
          }}>

            {/* 카드 유형 */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>카드 유형</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {CARD_TYPES.map(({ key, label, desc }) => {
                  const isTradeType = TRADE_TYPES.includes(key);
                  const isWeeklyType = key === '이번주청약';
                  const active = cardType === key;
                  const bg = active
                    ? (isTradeType ? '#7c3aed' : isWeeklyType ? '#0891b2' : '#1d4ed8')
                    : (isTradeType ? '#f5f3ff' : isWeeklyType ? '#ecfeff' : '#f1f5f9');
                  const color = active
                    ? '#fff'
                    : (isTradeType ? '#5b21b6' : isWeeklyType ? '#0e7490' : '#374151');
                  return (
                    <button key={key} onClick={() => { setCardType(key); setCurrentPage(1); }} style={{
                      padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: bg, color, textAlign: 'left',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 주간/월간 토글 (실거래 카드만) */}
            {isTrade && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>집계 기간</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['monthly', 'weekly'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setTradePeriod(p)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: tradePeriod === p ? '#7c3aed' : '#f5f3ff',
                        color: tradePeriod === p ? '#fff' : '#5b21b6',
                        fontSize: 13, fontWeight: 700,
                      }}
                    >
                      {p === 'monthly' ? '이번달' : '이번주'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 지역 (청약/미분양만) */}
            {!isTrade && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>지역</p>
                <select value={region} onChange={e => setRegion(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* 이번주 날짜 표시 */}
            {cardType === '이번주청약' && (
              <div style={{ background: '#ecfeff', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#0e7490', fontWeight: 600 }}>
                📆 {week.label}
              </div>
            )}

            {/* 월 선택 (청약일정만) */}
            {cardType === '청약일정' && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>월</p>
                <select value={month} onChange={e => setMonth(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
                  {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* 실거래 통계 정보 */}
            {isTrade && (
              <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
                {tradeStats ? (
                  <>
                    <div style={{ color: '#5b21b6', fontWeight: 700, marginBottom: 4 }}>✅ 집계 완료</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      집계일: {tradeStats.stat_date}<br />
                      {tradePeriod === 'weekly'
                        ? `기준: ${tradeStats.week_start?.slice(5).replace('-', '.')}~${tradeStats.week_end?.slice(5).replace('-', '.')}`
                        : `기준월: ${tradeStats.current_month.slice(0, 4)}년 ${parseInt(tradeStats.current_month.slice(4))}월`}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>
                    {tradePeriod === 'weekly'
                      ? '주간 집계 데이터가 없습니다. 매주 월요일 03:00 KST에 자동 집계됩니다.'
                      : '아직 집계된 데이터가 없습니다. GitHub Actions가 매일 03:00 KST에 자동 집계합니다.'}
                  </div>
                )}
              </div>
            )}

            {/* 데이터 현황 (청약/미분양) */}
            {!isTrade && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
                전체 <strong style={{ color: '#1e293b' }}>{totalCount}건</strong>
                {totalPages > 1 && (
                  <span style={{ display: 'block', marginTop: 4, color: '#1d4ed8', fontWeight: 600 }}>
                    → {totalPages}장 카드 생성 가능
                  </span>
                )}
                {totalCount > MAX_PAGES * PER_PAGE && (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#f59e0b' }}>
                    ⚠️ 최대 {MAX_PAGES * PER_PAGE}건까지 표시
                  </span>
                )}
              </div>
            )}

            {/* 페이지 선택 */}
            {!isTrade && totalPages > 1 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>카드 페이지</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: currentPage === p ? '#1d4ed8' : '#f1f5f9',
                      color: currentPage === p ? '#fff' : '#374151',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {p}장
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={openFullView} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: isTrade ? '#7c3aed' : cardType === '이번주청약' ? '#0891b2' : '#1d4ed8',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              📸 {!isTrade && totalPages > 1 ? `${currentPage}장 ` : ''}새 창에서 캡처
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
              1080×1080 원본 크기로 열림
            </p>
            <a
              href="https://business.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', marginTop: 10, padding: '10px', borderRadius: 8,
                background: '#f0f4ff', border: '1px solid #c7d2fe',
                color: '#4338ca', fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              📤 메타 비즈니스 업로드
            </a>
          </div>

          {/* 미리보기 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              미리보기 (실제 크기의 {Math.round(SCALE * 100)}%)
              {!isTrade && totalPages > 1 && <span style={{ marginLeft: 8, color: '#1d4ed8', fontWeight: 600 }}>{currentPage} / {totalPages}장</span>}
              {isTrade && <span style={{ marginLeft: 8, color: '#7c3aed', fontWeight: 600 }}>{tradePeriod === 'weekly' ? '이번주' : '이번달'} 기준</span>}
            </p>
            <div style={{ width: cardW, height: cardH, position: 'relative' }}>
              {loading ? (
                <div style={{ width: cardW, height: cardH, background: '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#9ca3af' }}>
                  불러오는 중...
                </div>
              ) : (!isTrade && totalCount === 0) ? (
                <div style={{ width: cardW, height: cardH, background: '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <div style={{ fontSize: 14, color: '#9ca3af' }}>해당 조건의 데이터가 없습니다</div>
                </div>
              ) : (
                <InstaCard
                  type={cardType} region={region} month={month}
                  period={tradePeriod} weekLabel={week.label}
                  saleItems={saleItems} unsoldItems={unsoldItems}
                  tradeStats={tradeStats}
                  scale={SCALE} page={currentPage} totalPages={totalPages}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
