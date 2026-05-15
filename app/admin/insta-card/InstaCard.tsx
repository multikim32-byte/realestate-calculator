import type { CSSProperties } from 'react';

export type SaleItem = {
  name: string; location: string;
  receiptStart: string; receiptEnd: string;
  totalUnits: number | null; status: string;
  statusLabel?: string;
};

export type UnsoldItem = {
  name: string; location: string;
  min_price: number | null; max_price: number | null;
  benefit: string | null;
};

type Props = {
  type: '오늘의청약' | '청약일정' | '미분양';
  region: string;
  month: string;
  saleItems: SaleItem[];
  unsoldItems: UnsoldItem[];
  scale?: number;
  page?: number;
  totalPages?: number;
};

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

function fmtDateRange(start: string, end: string) {
  const s = start.slice(5).replace('-', '.');
  const e = end.slice(5).replace('-', '.');
  return `${s}~${e}`;
}

function fmtMonth(month: string) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return `${y}년 ${m}월`;
}

function fmtLocation(loc: string, parts = 3) {
  return loc.split(' ').slice(0, parts).join(' ');
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '마감임박': { bg: '#fef2f2', color: '#dc2626' },
  '청약중':   { bg: '#eff6ff', color: '#1d4ed8' },
  '청약예정': { bg: '#f0fdf4', color: '#16a34a' },
};

const PER_PAGE = 5;

export default function InstaCard({ type, region, month, saleItems, unsoldItems, scale = 1, page = 1, totalPages = 1 }: Props) {
  const W = 1080;
  const isToday  = type === '오늘의청약';
  const isSale   = type === '청약일정';
  const isUnsold = type === '미분양';

  const now = new Date();
  const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  const title = isToday
    ? '오늘의 청약 현황'
    : isSale
      ? `${region === '전국' ? '전국' : region} 청약 일정`
      : `${region === '전국' ? '전국' : region} 미분양 아파트`;

  const subtitle = isToday
    ? todayLabel
    : isSale
      ? fmtMonth(month)
      : '선착순 동·호 지정 가능';

  const px = (n: number) => n * scale;
  const sp = (n: number): CSSProperties => ({ fontSize: px(n) });

  const allItems = isUnsold ? unsoldItems : saleItems;
  const start = (page - 1) * PER_PAGE;
  const pageItems = allItems.slice(start, start + PER_PAGE);
  const count = pageItems.length;

  const fs = count <= 2 ? 1.4 : count <= 3 ? 1.22 : count <= 4 ? 1.1 : 1.0;

  const accentColor = isUnsold ? '#059669' : '#1d4ed8';
  const bgLight     = isUnsold ? '#f0fdf4' : '#eff6ff';
  const borderColor = isUnsold ? '#bbf7d0' : '#bfdbfe';

  const gridCols = isToday
    ? '1fr 180px 210px'
    : isSale
      ? '1fr 250px 175px'
      : '1fr 230px';

  const colHeaders = isToday
    ? ['단지명 / 지역', '상태', '청약기간']
    : isSale
      ? ['단지명 / 지역', '청약기간', '세대수']
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

      {/* 헤더 */}
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
          {totalPages > 1 && (
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
            {isToday ? '📅 오늘의 청약' : isSale ? '📅 청약 일정' : '🏢 미분양 정보'}
          </div>
        </div>
      </div>

      {/* 타이틀 */}
      <div style={{
        background: bgLight,
        padding: `${px(22)}px ${px(44)}px`,
        borderBottom: `${px(4)}px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ ...sp(56), fontWeight: 900, color: '#1e293b', lineHeight: 1.15 }}>{title}</div>
          <div style={{ ...sp(26), color: '#64748b', marginTop: px(6), fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div style={{
          background: accentColor, color: '#fff',
          borderRadius: px(50), padding: `${px(12)}px ${px(26)}px`,
          ...sp(28), fontWeight: 900, flexShrink: 0, marginLeft: px(16),
        }}>
          {isToday ? `총 ${count}건` : `${start + 1}–${start + count}건`}
        </div>
      </div>

      {/* 리스트 */}
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
          {isToday
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
                        ...sp(Math.round(32 * fs)), fontWeight: 800, color: '#1e293b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
                      }}>{item.name}</div>
                      <div style={{
                        ...sp(Math.round(21 * fs)), color: '#94a3b8', marginTop: px(5),
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
                      ...sp(Math.round(32 * fs)), fontWeight: 800, color: '#1e293b',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
                    }}>{item.name}</div>
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
                  <div style={{ ...sp(Math.round(26 * fs)), color: '#374151', fontWeight: 700 }}>
                    {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
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
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
                    }}>{item.name}</div>
                    <div style={{
                      ...sp(Math.round(21 * fs)), color: '#94a3b8', marginTop: px(5),
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{fmtLocation(item.location, 3)}</div>
                    {item.benefit && (
                      <div style={{
                        ...sp(Math.round(19 * fs)), color: '#f59e0b', marginTop: px(6), fontWeight: 700,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>✦ {item.benefit.slice(0, 26)}{item.benefit.length > 26 ? '…' : ''}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ ...sp(Math.round(48 * fs)), color: accentColor, fontWeight: 900, lineHeight: 1.1 }}>
                      {item.min_price || item.max_price
                        ? fmt만원(item.min_price ?? item.max_price!)
                        : '문의'}
                    </div>
                    {(item.min_price || item.max_price) && (
                      <div style={{ ...sp(Math.round(19 * fs)), color: '#94a3b8', marginTop: px(3) }}>부터~</div>
                    )}
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* 푸터 */}
      <div style={{
        background: '#1e293b',
        padding: `${px(20)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...sp(22), color: '#e2e8f0', fontWeight: 700 }}>aptzipsa.kr</div>
        <div style={{ ...sp(18), color: '#64748b' }}>
          #아파트집사 #{isToday ? '오늘의청약' : isSale ? '청약일정' : '미분양'} #{region === '전국' ? '전국아파트' : region}
        </div>
      </div>
    </div>
  );
}
