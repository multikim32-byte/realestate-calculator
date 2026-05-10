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
};

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

function fmtDateRange(start: string, end: string) {
  // YYYY-MM-DD → MM.DD
  const s = start.slice(5).replace('-', '.');
  const e = end.slice(5).replace('-', '.');
  return `${s} ~ ${e}`;
}

function fmtMonth(month: string) {
  // "2026-05" → "2026년 05월"
  if (!month) return '';
  const [y, m] = month.split('-');
  return `${y}년 ${m}월`;
}

function fmtLocation(loc: string) {
  return loc.split(' ').slice(0, 3).join(' ');
}

export default function InstaCard({ type, region, month, saleItems, unsoldItems, scale = 1 }: Props) {
  const W = 1080;
  const isSale = type === '청약일정';

  const title = isSale
    ? `${region === '전국' ? '전국' : region} 청약 일정`
    : `${region === '전국' ? '전국' : region} 미분양 아파트`;

  const subtitle = isSale ? fmtMonth(month) : '선착순 동·호 지정 가능';

  const px = (n: number) => n * scale;

  const items = isSale ? saleItems.slice(0, 9) : unsoldItems.slice(0, 9);
  const count = items.length;

  // 아이템 수에 따라 행 높이 동적 조절
  const listAreaH = 680; // 전체 리스트 영역 높이 (px, scale=1 기준)
  const headerH = px(7 * scale < 1 ? 55 : 55);   // 컬럼 헤더
  const rowH = count > 0 ? Math.min(110, Math.floor((listAreaH - 55) / count)) : 110;

  const s = (n: number): CSSProperties => ({ fontSize: px(n) });

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
        padding: `${px(28)}px ${px(48)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(14) }}>
          <div style={{
            background: '#fff', borderRadius: px(10),
            width: px(52), height: px(52),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...s(22), fontWeight: 900, color: '#1d4ed8', letterSpacing: -1,
          }}>AZ</div>
          <div>
            <div style={{ ...s(22), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>아파트집사</div>
            <div style={{ ...s(14), color: 'rgba(255,255,255,0.6)', marginTop: px(2) }}>aptzipsa.kr</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: px(20),
          padding: `${px(8)}px ${px(18)}px`,
          ...s(16), color: '#fff', fontWeight: 700,
        }}>
          {isSale ? '📅 청약 일정' : '🏢 미분양 정보'}
        </div>
      </div>

      {/* ── 타이틀 ── */}
      <div style={{
        background: bgLight,
        padding: `${px(22)}px ${px(48)}px`,
        borderBottom: `${px(3)}px solid ${borderColor}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ ...s(42), fontWeight: 900, color: '#1e293b', lineHeight: 1.15 }}>{title}</div>
          <div style={{ ...s(20), color: '#64748b', marginTop: px(6), fontWeight: 600 }}>{subtitle}</div>
        </div>
        <div style={{
          background: accentColor, color: '#fff',
          borderRadius: px(12), padding: `${px(8)}px ${px(16)}px`,
          ...s(18), fontWeight: 800,
          flexShrink: 0, marginLeft: px(12),
        }}>
          {count}건
        </div>
      </div>

      {/* ── 리스트 ── */}
      <div style={{ flex: 1, padding: `${px(16)}px ${px(48)}px ${px(8)}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* 컬럼 헤더 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSale ? '1fr 200px 130px' : '1fr 180px',
          padding: `${px(8)}px ${px(12)}px`,
          background: '#f8fafc',
          borderRadius: px(8),
          marginBottom: px(6),
          flexShrink: 0,
        }}>
          {(isSale ? ['단지명 / 지역', '청약기간', '세대수'] : ['단지명 / 지역', '분양가']).map(h => (
            <div key={h} style={{ ...s(14), color: '#94a3b8', fontWeight: 700 }}>{h}</div>
          ))}
        </div>

        {/* 리스트 행 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {isSale
            ? (items as SaleItem[]).map((item, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 130px',
                height: px(rowH),
                alignItems: 'center',
                borderBottom: `${px(1.5)}px solid #f1f5f9`,
                paddingLeft: px(12),
                paddingRight: px(12),
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(12) }}>
                  <div style={{
                    ...s(Math.min(20, rowH * 0.28)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...s(Math.min(15, rowH * 0.2)),
                    color: '#94a3b8', marginTop: px(3),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location)}</div>
                </div>
                <div style={{
                  ...s(Math.min(18, rowH * 0.25)),
                  color: accentColor, fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {item.receiptStart && item.receiptEnd
                    ? fmtDateRange(item.receiptStart, item.receiptEnd)
                    : <span style={{ color: '#94a3b8', ...s(14) }}>{item.status}</span>}
                </div>
                <div style={{
                  ...s(Math.min(18, rowH * 0.25)),
                  color: '#374151', fontWeight: 700,
                }}>
                  {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
                </div>
              </div>
            ))
            : (items as UnsoldItem[]).map((item, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 180px',
                height: px(rowH),
                alignItems: 'center',
                borderBottom: `${px(1.5)}px solid #f1f5f9`,
                paddingLeft: px(12),
                paddingRight: px(12),
              }}>
                <div style={{ overflow: 'hidden', paddingRight: px(16) }}>
                  <div style={{
                    ...s(Math.min(22, rowH * 0.28)),
                    fontWeight: 800, color: '#1e293b',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>{item.name}</div>
                  <div style={{
                    ...s(Math.min(15, rowH * 0.2)),
                    color: '#94a3b8', marginTop: px(3),
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{fmtLocation(item.location)}</div>
                  {item.benefit && rowH >= 85 && (
                    <div style={{
                      ...s(Math.min(14, rowH * 0.17)),
                      color: '#f59e0b', marginTop: px(4), fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>✦ {item.benefit.slice(0, 28)}{item.benefit.length > 28 ? '…' : ''}</div>
                  )}
                </div>
                <div>
                  <div style={{
                    ...s(Math.min(24, rowH * 0.3)),
                    color: accentColor, fontWeight: 800,
                    lineHeight: 1.2,
                  }}>
                    {item.min_price || item.max_price
                      ? fmt만원(item.min_price ?? item.max_price!)
                      : '문의'}
                  </div>
                  {(item.min_price || item.max_price) && (
                    <div style={{ ...s(13), color: '#94a3b8', marginTop: px(2) }}>부터~</div>
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
        padding: `${px(18)}px ${px(48)}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...s(16), color: '#e2e8f0', fontWeight: 700 }}>aptzipsa.kr</div>
        <div style={{ ...s(14), color: '#64748b' }}>
          #아파트집사 #{isSale ? '청약일정' : '미분양'} #{region === '전국' ? '전국아파트' : region}
        </div>
      </div>
    </div>
  );
}
