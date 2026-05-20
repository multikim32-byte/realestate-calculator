import type { CSSProperties } from 'react';

export type SaleItem = {
  name: string; location: string;
  receiptStart: string; receiptEnd: string;
  totalUnits: number | null; status: string;
  minPrice?: number; maxPrice?: number;
  statusLabel?: string;
};

export type UnsoldItem = {
  name: string; location: string;
  min_price: number | null; max_price: number | null;
  benefit: string | null;
};

export type TradeStatItem = {
  rank: number;
  name: string;
  dong: string;
  location: string;
  builtYear?: number;
  areaBucket?: number;
  currentAvg?: number;
  prevAvg?: number;
  changePct?: number;
  count?: number;
  price?: number;
  dealDate?: string;
  area?: number;
  floor?: number;
  avgPrice?: number;
};

export type TradeStats = {
  stat_date: string;
  current_month: string;
  prev_month: string;
  week_start?: string;
  week_end?: string;
  rising: TradeStatItem[];
  falling: TradeStatItem[];
  top_price: TradeStatItem[];
  top_volume: TradeStatItem[];
} | null;

export type CardType =
  | '오늘의청약' | '이번주청약' | '청약일정' | '미분양'
  | '급등TOP10' | '급락TOP10' | '신고가TOP10' | '거래량TOP10';

type Props = {
  type: CardType;
  region: string;
  month: string;
  period?: 'monthly' | 'weekly';
  weekLabel?: string;
  saleItems: SaleItem[];
  unsoldItems: UnsoldItem[];
  tradeStats?: TradeStats;
  scale?: number;
  page?: number;
  totalPages?: number;
};

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000)     return `${(v / 10000).toFixed(1).replace(/\.0$/, '')}억`;
  if (v >= 1000)      return `${Math.round(v / 1000)}천만`;
  return `${v.toLocaleString()}만`;
}

function fmtSalePrice(min: number | undefined, max: number | undefined): string {
  if (!min && !max) return '미정';
  const fmt = (p: number) => {
    if (p >= 10000) return `${(p / 10000).toFixed(1).replace(/\.0$/, '')}억`;
    return `${Math.round(p / 1000)}천만`;
  };
  const lo = min || max!;
  const hi = max || min!;
  return lo === hi ? fmt(lo) : `${fmt(lo)}~${fmt(hi)}`;
}

function fmtDateRange(start: string, end: string) {
  return `${start.slice(5).replace('-', '.')}~${end.slice(5).replace('-', '.')}`;
}

function fmtMonth(month: string) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return `${y}년 ${m}월`;
}

function fmtLocation(loc: string, parts = 3) {
  return loc.split(' ').slice(0, parts).join(' ');
}

function fmtYearMonth(ym: string) {
  if (!ym || ym.length < 6) return ym;
  return `${ym.slice(0, 4)}년 ${parseInt(ym.slice(4))}월`;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '마감임박': { bg: '#fef2f2', color: '#dc2626' },
  '청약중':   { bg: '#eff6ff', color: '#1d4ed8' },
  '청약예정': { bg: '#f0fdf4', color: '#16a34a' },
};

const PER_PAGE = 5;

const RANK_COLOR = ['#f59e0b', '#94a3b8', '#cd7f32'];

export default function InstaCard({
  type, region, month, period = 'monthly', weekLabel,
  saleItems, unsoldItems,
  tradeStats, scale = 1, page = 1, totalPages = 1,
}: Props) {
  const W = 1080;

  const isToday   = type === '오늘의청약';
  const isWeekly  = type === '이번주청약';
  const isSale    = type === '청약일정';
  const isUnsold  = type === '미분양';
  const isRising  = type === '급등TOP10';
  const isFalling = type === '급락TOP10';
  const isTopPri  = type === '신고가TOP10';
  const isTopVol  = type === '거래량TOP10';
  const isTrade   = isRising || isFalling || isTopPri || isTopVol;
  const isWeeklyTrade = isTrade && period === 'weekly';

  const now = new Date();
  const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  const px = (n: number) => n * scale;
  const sp = (n: number): CSSProperties => ({ fontSize: px(n) });

  // ── 실거래 카드 데이터 ───────────────────────────────────────────────────────
  const tradeItems: TradeStatItem[] = isTrade && tradeStats
    ? isRising  ? tradeStats.rising
    : isFalling ? tradeStats.falling
    : isTopPri  ? tradeStats.top_price
    : tradeStats.top_volume
    : [];

  // ── 청약/미분양 카드 데이터 ──────────────────────────────────────────────────
  const allItems = isUnsold ? unsoldItems : saleItems;
  const start    = (page - 1) * PER_PAGE;
  const pageItems = allItems.slice(start, start + PER_PAGE);
  const count    = pageItems.length;
  const fs = count <= 2 ? 1.4 : count <= 3 ? 1.22 : count <= 4 ? 1.1 : 1.0;

  // ── 색상 ────────────────────────────────────────────────────────────────────
  const accentColor = isTrade
    ? (isRising || isTopPri ? '#dc2626' : isFalling ? '#2563eb' : '#7c3aed')
    : isUnsold ? '#059669' : '#1d4ed8';

  const bgLight = isTrade
    ? (isRising || isTopPri ? '#fef2f2' : isFalling ? '#eff6ff' : '#f5f3ff')
    : isUnsold ? '#f0fdf4' : '#eff6ff';

  const borderColor = isTrade
    ? (isRising || isTopPri ? '#fecaca' : isFalling ? '#bfdbfe' : '#ddd6fe')
    : isUnsold ? '#bbf7d0' : '#bfdbfe';

  // ── 타이틀 텍스트 ─────────────────────────────────────────────────────────────
  const title = isTrade
    ? (isRising ? '급등 아파트 TOP 10' : isFalling ? '급락 아파트 TOP 10' : isTopPri ? '신고가 거래 TOP 10' : '거래량 TOP 10')
    : isWeekly ? `${region === '전국' ? '전국' : region} 이번주 청약`
    : isToday ? '오늘의 청약 현황'
    : isSale  ? `${region === '전국' ? '전국' : region} 청약 일정`
    : `${region === '전국' ? '전국' : region} 미분양 아파트`;

  const subtitle = isTrade
    ? (tradeStats
      ? (isWeeklyTrade
        ? `전국 · 이번주 기준${tradeStats.week_start ? ` (${tradeStats.week_start.slice(5).replace('-', '.')}~${tradeStats.week_end?.slice(5).replace('-', '.')})` : ''}`
        : `전국 · ${fmtYearMonth(tradeStats.current_month)} 기준`)
      : '집계 데이터 없음')
    : isWeekly ? (weekLabel ?? '이번주 청약 일정')
    : isToday ? todayLabel
    : isSale  ? fmtMonth(month)
    : '선착순 동·호 지정 가능';

  const badgeText = isTrade
    ? `${isWeeklyTrade ? '주간 ' : ''}${isRising ? '📈 급등 TOP 10' : isFalling ? '📉 급락 TOP 10' : isTopPri ? '🏆 신고가 TOP 10' : '🔥 거래량 TOP 10'}`
    : isWeekly ? '📆 이번주 청약'
    : isToday ? '📅 오늘의 청약' : isSale ? '📅 청약 일정' : '🏢 미분양 정보';

  // ── 청약/미분양 카드 컬럼 ────────────────────────────────────────────────────
  const gridCols = (isToday || isWeekly) ? '1fr 180px 210px'
    : isSale    ? '1fr 220px 200px'
    : '1fr 230px';

  const colHeaders = (isToday || isWeekly) ? ['단지명 / 지역', '상태', '청약기간']
    : isSale    ? ['단지명 / 지역', '청약기간', '세대수 / 분양가']
    : ['단지명 / 지역', '분양가'];

  return (
    <div style={{
      width: px(W), height: px(W),
      background: '#fff', overflow: 'hidden',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
      display: 'flex', flexDirection: 'column',
      boxShadow: scale < 1 ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
      borderRadius: scale < 1 ? px(16) : 0,
    }}>

      {/* ── 헤더 ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2044 0%, #1d4ed8 100%)',
        padding: `${px(30)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(18) }}>
          <div style={{
            background: '#fff', borderRadius: px(14),
            width: px(72), height: px(72),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...sp(30), fontWeight: 900, color: '#1d4ed8',
          }}>AZ</div>
          <div>
            <div style={{ ...sp(34), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>아파트집사</div>
            <div style={{ ...sp(19), color: 'rgba(255,255,255,0.55)', marginTop: px(3) }}>aptzipsa.kr</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
          {!isTrade && totalPages > 1 && (
            <div style={{
              background: 'rgba(255,255,255,0.22)', borderRadius: px(20),
              padding: `${px(9)}px ${px(18)}px`,
              ...sp(22), color: '#fff', fontWeight: 700,
            }}>
              {page} / {totalPages}
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: px(24),
            padding: `${px(10)}px ${px(22)}px`,
            ...sp(21), color: '#fff', fontWeight: 700,
          }}>
            {badgeText}
          </div>
        </div>
      </div>

      {/* ── 타이틀 ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: bgLight,
        padding: `${px(22)}px ${px(44)}px`,
        borderBottom: `${px(4)}px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ ...sp(isTrade ? 50 : 56), fontWeight: 900, color: '#1e293b', lineHeight: 1.15 }}>{title}</div>
          <div style={{ ...sp(26), color: '#64748b', marginTop: px(6), fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div style={{
          background: accentColor, color: '#fff',
          borderRadius: px(50), padding: `${px(12)}px ${px(26)}px`,
          ...sp(28), fontWeight: 900, flexShrink: 0, marginLeft: px(16),
        }}>
          {isTrade ? `전국` : (isToday || isWeekly) ? `총 ${count}건` : `${start + 1}–${start + count}건`}
        </div>
      </div>

      {/* ── 콘텐츠 ───────────────────────────────────────────────────────────── */}
      {isTrade ? (
        // 실거래 통계 카드
        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          padding: `${px(10)}px ${px(40)}px ${px(8)}px`,
        }}>
          {tradeItems.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: px(12),
            }}>
              <div style={{ ...sp(40) }}>📊</div>
              <div style={{ ...sp(22), color: '#94a3b8' }}>집계 데이터가 없습니다</div>
              <div style={{ ...sp(18), color: '#cbd5e1' }}>
                {isWeeklyTrade ? '매주 월요일 자동 집계됩니다' : 'GitHub Actions 집계 후 표시됩니다'}
              </div>
            </div>
          ) : (
            tradeItems.map((item, i) => (
              <div key={i} style={{
                flex: 1, display: 'flex', alignItems: 'center',
                borderBottom: i < tradeItems.length - 1 ? `${px(1)}px solid #f1f5f9` : 'none',
                padding: `0 ${px(4)}px`,
                gap: px(14), overflow: 'hidden',
              }}>
                {/* 순위 */}
                <div style={{
                  ...sp(26), fontWeight: 900, flexShrink: 0,
                  width: px(44), textAlign: 'center',
                  color: RANK_COLOR[i] ?? '#94a3b8',
                }}>
                  {i + 1}
                </div>

                {/* 단지명 + 위치 */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    ...sp(23), fontWeight: 800, color: '#1e293b',
                    lineHeight: 1.25, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </div>
                  <div style={{
                    ...sp(16), color: '#94a3b8', marginTop: px(3),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.location}
                    {item.dong ? ` · ${item.dong}` : ''}
                    {(isRising || isFalling) && item.areaBucket ? ` · ${item.areaBucket}㎡` : ''}
                    {isTopPri && item.area ? ` · ${item.area}㎡` : ''}
                  </div>
                </div>

                {/* 값 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {(isRising || isFalling) && item.changePct != null && (
                    <>
                      <div style={{
                        ...sp(28), fontWeight: 900,
                        color: item.changePct > 0 ? '#dc2626' : '#2563eb',
                      }}>
                        {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(1)}%
                      </div>
                      {item.currentAvg != null && (
                        <div style={{ ...sp(15), color: '#94a3b8', marginTop: px(2) }}>
                          {fmt만원(item.currentAvg)}
                        </div>
                      )}
                    </>
                  )}
                  {isTopPri && item.price != null && (
                    <>
                      <div style={{ ...sp(28), fontWeight: 900, color: '#dc2626' }}>
                        {fmt만원(item.price)}
                      </div>
                      {item.dealDate && (
                        <div style={{ ...sp(15), color: '#94a3b8', marginTop: px(2) }}>
                          {item.dealDate.slice(5).replace('-', '.')}
                        </div>
                      )}
                    </>
                  )}
                  {isTopVol && item.count != null && (
                    <>
                      <div style={{ ...sp(28), fontWeight: 900, color: '#7c3aed' }}>
                        {item.count}건
                      </div>
                      {item.avgPrice != null && (
                        <div style={{ ...sp(15), color: '#94a3b8', marginTop: px(2) }}>
                          평균 {fmt만원(item.avgPrice)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // 청약 / 미분양 카드
        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          padding: `${px(14)}px ${px(44)}px ${px(10)}px`,
        }}>
          {/* 컬럼 헤더 */}
          <div style={{
            display: 'grid', gridTemplateColumns: gridCols,
            padding: `${px(10)}px ${px(16)}px`,
            background: '#f1f5f9', borderRadius: px(10),
            marginBottom: px(6), flexShrink: 0,
          }}>
            {colHeaders.map(h => (
              <div key={h} style={{ ...sp(19), color: '#94a3b8', fontWeight: 700 }}>{h}</div>
            ))}
          </div>

          {/* 행들 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {(isToday || isWeekly)
              ? (pageItems as SaleItem[]).map((item, i) => {
                  const ss = STATUS_STYLE[item.statusLabel ?? ''] ?? { bg: '#f1f5f9', color: '#64748b' };
                  return (
                    <div key={i} style={{
                      flex: 1, display: 'grid', gridTemplateColumns: gridCols,
                      alignItems: 'center',
                      borderBottom: i < count - 1 ? `${px(2)}px solid #f1f5f9` : 'none',
                      paddingLeft: px(16), paddingRight: px(16), overflow: 'hidden',
                    }}>
                      <div style={{ overflow: 'hidden', paddingRight: px(12) }}>
                        <div style={{
                          ...sp(Math.round(29 * fs)), fontWeight: 800, color: '#1e293b',
                          lineHeight: 1.3, wordBreak: 'keep-all',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as CSSProperties}>{item.name}</div>
                        <div style={{
                          ...sp(Math.round(20 * fs)), color: '#94a3b8', marginTop: px(4),
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{fmtLocation(item.location)}</div>
                      </div>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          background: ss.bg, color: ss.color,
                          borderRadius: px(8), padding: `${px(7)}px ${px(16)}px`,
                          ...sp(Math.round(22 * fs)), fontWeight: 800,
                        }}>{item.statusLabel ?? ''}</span>
                      </div>
                      <div style={{ ...sp(Math.round(23 * fs)), color: '#374151', fontWeight: 600 }}>
                        {item.receiptStart && item.receiptEnd
                          ? fmtDateRange(item.receiptStart, item.receiptEnd)
                          : '-'}
                      </div>
                    </div>
                  );
                })
              : isSale
                ? (pageItems as SaleItem[]).map((item, i) => (
                  <div key={i} style={{
                    flex: 1, display: 'grid', gridTemplateColumns: gridCols,
                    alignItems: 'center',
                    borderBottom: i < count - 1 ? `${px(2)}px solid #f1f5f9` : 'none',
                    paddingLeft: px(16), paddingRight: px(16), overflow: 'hidden',
                  }}>
                    <div style={{ overflow: 'hidden', paddingRight: px(12) }}>
                      <div style={{
                        ...sp(Math.round(30 * fs)), fontWeight: 800, color: '#1e293b',
                        lineHeight: 1.3, wordBreak: 'keep-all',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      } as CSSProperties}>{item.name}</div>
                      <div style={{
                        ...sp(Math.round(21 * fs)), color: '#94a3b8', marginTop: px(5),
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{fmtLocation(item.location)}</div>
                    </div>
                    <div style={{ ...sp(Math.round(26 * fs)), color: accentColor, fontWeight: 700, lineHeight: 1.4 }}>
                      {item.receiptStart && item.receiptEnd
                        ? fmtDateRange(item.receiptStart, item.receiptEnd)
                        : <span style={{ color: '#94a3b8' }}>{item.status}</span>}
                    </div>
                    <div>
                      <div style={{ ...sp(Math.round(26 * fs)), color: '#374151', fontWeight: 700 }}>
                        {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
                      </div>
                      {(item.minPrice || item.maxPrice) ? (
                        <div style={{ ...sp(Math.round(20 * fs)), color: accentColor, fontWeight: 700, marginTop: px(3) }}>
                          {fmtSalePrice(item.minPrice, item.maxPrice)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
                : (pageItems as UnsoldItem[]).map((item, i) => (
                  <div key={i} style={{
                    flex: 1, display: 'grid', gridTemplateColumns: gridCols,
                    alignItems: 'center',
                    borderBottom: i < count - 1 ? `${px(2)}px solid #f1f5f9` : 'none',
                    paddingLeft: px(16), paddingRight: px(16), overflow: 'hidden',
                  }}>
                    <div style={{ overflow: 'hidden', paddingRight: px(16) }}>
                      <div style={{
                        ...sp(Math.round(33 * fs)), fontWeight: 800, color: '#1e293b',
                        lineHeight: 1.3, wordBreak: 'keep-all',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      } as CSSProperties}>{item.name}</div>
                      <div style={{
                        ...sp(Math.round(21 * fs)), color: '#94a3b8', marginTop: px(5),
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{fmtLocation(item.location, 3)}</div>
                    </div>
                    <div>
                      <div style={{ ...sp(Math.round(50 * fs)), color: accentColor, fontWeight: 900, lineHeight: 1.1 }}>
                        {item.min_price || item.max_price
                          ? fmt만원(item.min_price ?? item.max_price!)
                          : '문의'}
                      </div>
                      {(item.min_price || item.max_price) && (
                        <div style={{ ...sp(Math.round(20 * fs)), color: '#94a3b8', marginTop: px(3) }}>부터~</div>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* ── 푸터 ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1e293b',
        padding: `${px(20)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...sp(22), color: '#e2e8f0', fontWeight: 700 }}>aptzipsa.kr</div>
        <div style={{ ...sp(18), color: '#64748b' }}>
          {isTrade
            ? `#아파트집사 #실거래가 #${isWeeklyTrade ? '이번주' : '이번달'} #${isRising ? '급등아파트' : isFalling ? '급락아파트' : isTopPri ? '신고가' : '거래량'}`
            : `#아파트집사 #${isWeekly ? '이번주청약' : isToday ? '오늘의청약' : isSale ? '청약일정' : '미분양'} #${region === '전국' ? '전국아파트' : region}`}
        </div>
      </div>
    </div>
  );
}
