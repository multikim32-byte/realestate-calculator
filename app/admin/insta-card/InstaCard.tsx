import type { CSSProperties } from 'react';

export type SaleItem = {
  name: string; location: string;
  receiptStart: string; receiptEnd: string;
  totalUnits: number | null; status: string;
};

export type UnsoldItem = {
  name: string; location: string;
  min_price: number | null; max_price: number | null;
  benefit: string | null;
};

type Props = {
  type: '청약일정' | '미분양';
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
  return `${s} ~ ${e}`;
}

function fmtMonth(month: string) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return `${y}년 ${m}월`;
}

function fmtLocation(loc: string, parts = 3) {
  return loc.split(' ').slice(0, parts).join(' ');
}

const PER_PAGE = 5;

export default function InstaCard({ type, region, month, saleItems, unsoldItems, scale = 1, page = 1, totalPages = 1 }: Props) {
  const W = 1080;
  const isSale = type === '청약일정';

  const title = isSale
    ? `${region === '전국' ? '전국' : region} 청약 일정`
    : `${region === '전국' ? '전국' : region} 미분양 아파트`;
  const subtitle = isSale ? fmtMonth(month) : '선착순 동·호 지정 가능';

  const px = (n: number) => n * scale;
  const sp = (n: number): CSSProperties => ({ fontSize: px(n) });

  // 현재 페이지에 해당하는 5건만 슬라이스
  const allItems = isSale ? saleItems : unsoldItems;
  const start = (page - 1) * PER_PAGE;
  const pageItems = allItems.slice(start, start + PER_PAGE);
  const count = pageItems.length;

  // count에 따라 폰트 비율 조정 (5건 = 1.0 기준, 적을수록 더 크게)
  const fs = count <= 2 ? 1.55 : count <= 3 ? 1.35 : count <= 4 ? 1.15 : 1.0;

  const accentColor = isSale ? '#1d4ed8' : '#059669';
  const bgLight = isSale ? '#eff6ff' : '#f0fdf4';
  const borderColor = isSale ? '#bfdbfe' : '#bbf7d0';

  return (
    <div style={{
      width: px(W), height: px(W),
      background: '#fff', overflow: 'hidden',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
      display: 'flex', flexDirection: 'column',
      boxShadow: scale < 1 ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
      borderRadius: scale < 1 ? px(16) : 0,
    }}>

      {/* ── 헤더 ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2044 0%, #1d4ed8 100%)',
        padding: `${px(26)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(14) }}>
          <div style={{
            background: '#fff', borderRadius: px(10),
            width: px(54), height: px(54),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...sp(23), fontWeight: 900, color: '#1d4ed8',
          }}>AZ</div>
          <div>
            <div style={{ ...sp(23), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>아파트집사</div>
            <div style={{ ...sp(13), color: 'rgba(255,255,255,0.55)', marginTop: px(2) }}>aptzipsa.kr</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
          {totalPages > 1 && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: px(16),
              padding: `${px(6)}px ${px(14)}px`,
              ...sp(15), color: '#fff', fontWeight: 700,
            }}>
              {page} / {totalPages}
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: px(20),
            padding: `${px(8)}px ${px(18)}px`,
            ...sp(15), color: '#fff', fontWeight: 700,
          }}>
            {isSale ? '📅 청약 일정' : '🏢 미분양 정보'}
          </div>
        </div>
      </div>

      {/* ── 타이틀 ── */}
      <div style={{
        background: bgLight,
        padding: `${px(20)}px ${px(44)}px`,
        borderBottom: `${px(3)}px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ ...sp(42), fontWeight: 900, color: '#1e293b', lineHeight: 1.15 }}>{title}</div>
          <div style={{ ...sp(19), color: '#64748b', marginTop: px(5), fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div style={{
          background: accentColor, color: '#fff',
          borderRadius: px(50), padding: `${px(8)}px ${px(22)}px`,
          ...sp(22), fontWeight: 900, flexShrink: 0, marginLeft: px(16),
        }}>
          {start + 1}–{start + count}건
        </div>
      </div>

      {/* ── 리스트 ── */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: `${px(12)}px ${px(44)}px ${px(8)}px`,
      }}>
        {/* 컬럼 헤더 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSale ? '1fr 220px 150px' : '1fr 200px',
          padding: `${px(8)}px ${px(14)}px`,
          background: '#f1f5f9',
          borderRadius: px(8),
          marginBottom: px(6),
          flexShrink: 0,
        }}>
          {(isSale
            ? ['단지명 / 지역', '청약기간', '세대수']
            : ['단지명 / 지역', '분양가']
          ).map(h => (
            <div key={h} style={{ ...sp(14), color: '#94a3b8', fontWeight: 700 }}>{h}</div>
          ))}
        </div>

        {/* 행들 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isSale
            ? (pageItems as SaleItem[]).map((item, i) => (
              <div key={i} style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 220px 150px',
                alignItems: 'center',
                borderBottom: i < count - 1 ? `${px(1.5)}px solid #f1f5f9` : 'none',
                paddingLeft: px(14), paddingRight: px(14),
                overflow: 'hidden',
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(12) }}>
                  <div style={{
                    ...sp(Math.round(20 * fs)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...sp(Math.round(14 * fs)),
                    color: '#94a3b8', marginTop: px(4),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location)}</div>
                  {fs >= 1.3 && item.status && (
                    <div style={{
                      display: 'inline-block',
                      background: accentColor + '18', color: accentColor,
                      borderRadius: px(4), padding: `${px(2)}px ${px(8)}px`,
                      ...sp(Math.round(13 * fs)), fontWeight: 700, marginTop: px(6),
                    }}>{item.status}</div>
                  )}
                </div>
                <div style={{
                  ...sp(Math.round(18 * fs)),
                  color: accentColor, fontWeight: 700, lineHeight: 1.4,
                }}>
                  {item.receiptStart && item.receiptEnd
                    ? fmtDateRange(item.receiptStart, item.receiptEnd)
                    : <span style={{ color: '#94a3b8' }}>{item.status}</span>}
                </div>
                <div style={{ ...sp(Math.round(18 * fs)), color: '#374151', fontWeight: 700 }}>
                  {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
                </div>
              </div>
            ))
            : (pageItems as UnsoldItem[]).map((item, i) => (
              <div key={i} style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 200px',
                alignItems: 'center',
                borderBottom: i < count - 1 ? `${px(1.5)}px solid #f1f5f9` : 'none',
                paddingLeft: px(14), paddingRight: px(14),
                overflow: 'hidden',
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(16) }}>
                  <div style={{
                    ...sp(Math.round(21 * fs)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...sp(Math.round(14 * fs)),
                    color: '#94a3b8', marginTop: px(4),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location, 3)}</div>
                  {item.benefit && (
                    <div style={{
                      ...sp(Math.round(13 * fs)),
                      color: '#f59e0b', marginTop: px(6), fontWeight: 700,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>✦ {item.benefit.slice(0, 32)}{item.benefit.length > 32 ? '…' : ''}</div>
                  )}
                </div>
                <div>
                  <div style={{
                    ...sp(Math.round((fs >= 1.4 ? 40 : fs >= 1.2 ? 32 : 26) * (fs >= 1.0 ? 1 : fs))),
                    color: accentColor, fontWeight: 900, lineHeight: 1.1,
                  }}>
                    {item.min_price || item.max_price
                      ? fmt만원(item.min_price ?? item.max_price!)
                      : '문의'}
                  </div>
                  {(item.min_price || item.max_price) && (
                    <div style={{ ...sp(Math.round(14 * fs)), color: '#94a3b8', marginTop: px(3) }}>부터~</div>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── 푸터 ── */}
      <div style={{
        background: '#1e293b',
        padding: `${px(17)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...sp(16), color: '#e2e8f0', fontWeight: 700 }}>aptzipsa.kr</div>
        <div style={{ ...sp(13), color: '#64748b' }}>
          #아파트집사 #{isSale ? '청약일정' : '미분양'} #{region === '전국' ? '전국아파트' : region}
        </div>
      </div>
    </div>
  );
}
