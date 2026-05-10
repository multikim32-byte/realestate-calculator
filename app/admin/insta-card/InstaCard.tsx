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

  const allItems = isSale ? saleItems : unsoldItems;
  const start = (page - 1) * PER_PAGE;
  const pageItems = allItems.slice(start, start + PER_PAGE);
  const count = pageItems.length;

  // 5건 기준 폰트 스케일 — 적을수록 더 크게
  const fs = count <= 2 ? 1.5 : count <= 3 ? 1.3 : count <= 4 ? 1.12 : 1.0;

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
        padding: `${px(28)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(16) }}>
          <div style={{
            background: '#fff', borderRadius: px(12),
            width: px(62), height: px(62),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...sp(26), fontWeight: 900, color: '#1d4ed8',
          }}>AZ</div>
          <div>
            <div style={{ ...sp(28), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>아파트집사</div>
            <div style={{ ...sp(16), color: 'rgba(255,255,255,0.55)', marginTop: px(3) }}>aptzipsa.kr</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(10) }}>
          {totalPages > 1 && (
            <div style={{
              background: 'rgba(255,255,255,0.22)',
              borderRadius: px(18),
              padding: `${px(8)}px ${px(16)}px`,
              ...sp(18), color: '#fff', fontWeight: 700,
            }}>
              {page} / {totalPages}
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: px(22),
            padding: `${px(9)}px ${px(20)}px`,
            ...sp(18), color: '#fff', fontWeight: 700,
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
          <div style={{ ...sp(48), fontWeight: 900, color: '#1e293b', lineHeight: 1.15 }}>{title}</div>
          <div style={{ ...sp(22), color: '#64748b', marginTop: px(6), fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div style={{
          background: accentColor, color: '#fff',
          borderRadius: px(50), padding: `${px(10)}px ${px(24)}px`,
          ...sp(24), fontWeight: 900, flexShrink: 0, marginLeft: px(16),
        }}>
          {start + 1}–{start + count}건
        </div>
      </div>

      {/* ── 리스트 ── */}
      <div style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: `${px(14)}px ${px(44)}px ${px(10)}px`,
      }}>
        {/* 컬럼 헤더 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSale ? '1fr 230px 160px' : '1fr 210px',
          padding: `${px(9)}px ${px(14)}px`,
          background: '#f1f5f9',
          borderRadius: px(8),
          marginBottom: px(6),
          flexShrink: 0,
        }}>
          {(isSale
            ? ['단지명 / 지역', '청약기간', '세대수']
            : ['단지명 / 지역', '분양가']
          ).map(h => (
            <div key={h} style={{ ...sp(16), color: '#94a3b8', fontWeight: 700 }}>{h}</div>
          ))}
        </div>

        {/* 행들 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isSale
            ? (pageItems as SaleItem[]).map((item, i) => (
              <div key={i} style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 230px 160px',
                alignItems: 'center',
                borderBottom: i < count - 1 ? `${px(2)}px solid #f1f5f9` : 'none',
                paddingLeft: px(14), paddingRight: px(14),
                overflow: 'hidden',
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(12) }}>
                  <div style={{
                    ...sp(Math.round(26 * fs)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...sp(Math.round(18 * fs)),
                    color: '#94a3b8', marginTop: px(5),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location)}</div>
                </div>
                <div style={{
                  ...sp(Math.round(22 * fs)),
                  color: accentColor, fontWeight: 700, lineHeight: 1.4,
                }}>
                  {item.receiptStart && item.receiptEnd
                    ? fmtDateRange(item.receiptStart, item.receiptEnd)
                    : <span style={{ color: '#94a3b8' }}>{item.status}</span>}
                </div>
                <div style={{ ...sp(Math.round(22 * fs)), color: '#374151', fontWeight: 700 }}>
                  {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
                </div>
              </div>
            ))
            : (pageItems as UnsoldItem[]).map((item, i) => (
              <div key={i} style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 210px',
                alignItems: 'center',
                borderBottom: i < count - 1 ? `${px(2)}px solid #f1f5f9` : 'none',
                paddingLeft: px(14), paddingRight: px(14),
                overflow: 'hidden',
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(16) }}>
                  <div style={{
                    ...sp(Math.round(27 * fs)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...sp(Math.round(18 * fs)),
                    color: '#94a3b8', marginTop: px(5),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location, 3)}</div>
                  {item.benefit && (
                    <div style={{
                      ...sp(Math.round(16 * fs)),
                      color: '#f59e0b', marginTop: px(6), fontWeight: 700,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>✦ {item.benefit.slice(0, 28)}{item.benefit.length > 28 ? '…' : ''}</div>
                  )}
                </div>
                <div>
                  <div style={{
                    ...sp(Math.round(38 * fs)),
                    color: accentColor, fontWeight: 900, lineHeight: 1.1,
                  }}>
                    {item.min_price || item.max_price
                      ? fmt만원(item.min_price ?? item.max_price!)
                      : '문의'}
                  </div>
                  {(item.min_price || item.max_price) && (
                    <div style={{ ...sp(Math.round(16 * fs)), color: '#94a3b8', marginTop: px(3) }}>부터~</div>
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
        padding: `${px(18)}px ${px(44)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...sp(18), color: '#e2e8f0', fontWeight: 700 }}>aptzipsa.kr</div>
        <div style={{ ...sp(15), color: '#64748b' }}>
          #아파트집사 #{isSale ? '청약일정' : '미분양'} #{region === '전국' ? '전국아파트' : region}
        </div>
      </div>
    </div>
  );
}
