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
  const s = start.replace(/\./g, '/').slice(5); // MM/DD
  const e = end.replace(/\./g, '/').slice(5);
  return `${s}~${e}`;
}

export default function InstaCard({ type, region, month, saleItems, unsoldItems, scale = 1 }: Props) {
  const W = 1080;
  const title = type === '청약일정'
    ? `${region === '전국' ? '전국' : region} 청약 일정`
    : `${region === '전국' ? '전국' : region} 미분양 아파트`;
  const subtitle = type === '청약일정' ? month : '선착순 동·호 지정 가능';

  const s = (px: number): CSSProperties => ({ fontSize: px * scale });

  const items = type === '청약일정'
    ? saleItems.slice(0, 9)
    : unsoldItems.slice(0, 9);

  return (
    <div style={{
      width: W * scale, height: W * scale,
      background: '#fff', overflow: 'hidden',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      display: 'flex', flexDirection: 'column',
      boxShadow: scale < 1 ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
      borderRadius: scale < 1 ? 12 : 0,
    }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        padding: `${20 * scale}px ${36 * scale}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * scale }}>
          <div style={{
            background: '#fff', borderRadius: 8 * scale,
            width: 44 * scale, height: 44 * scale,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...s(20), fontWeight: 900, color: '#1d4ed8', letterSpacing: -1,
          }}>AZ</div>
          <div>
            <div style={{ ...s(18), fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>아파트집사</div>
            <div style={{ ...s(12), color: 'rgba(255,255,255,0.7)', marginTop: 1 * scale }}>aptzipsa.kr</div>
          </div>
        </div>
        <div style={{ ...s(14), color: 'rgba(255,255,255,0.85)', fontWeight: 600, textAlign: 'right' }}>
          {type === '청약일정' ? '📅 청약 일정' : '🏢 미분양 정보'}
        </div>
      </div>

      {/* 타이틀 */}
      <div style={{
        background: type === '청약일정' ? '#eff6ff' : '#f0fdf4',
        padding: `${16 * scale}px ${36 * scale}px`,
        borderBottom: `${2 * scale}px solid ${type === '청약일정' ? '#bfdbfe' : '#bbf7d0'}`,
        flexShrink: 0,
      }}>
        <div style={{ ...s(34), fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>{title}</div>
        <div style={{ ...s(16), color: '#6b7280', marginTop: 4 * scale, fontWeight: 600 }}>{subtitle}</div>
      </div>

      {/* 리스트 */}
      <div style={{ flex: 1, padding: `${12 * scale}px ${36 * scale}px`, overflow: 'hidden' }}>
        {type === '청약일정' ? (
          <>
            {/* 헤더 행 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 0.6fr 0.45fr',
              padding: `${6 * scale}px 0`, borderBottom: `${1 * scale}px solid #e5e7eb`,
              marginBottom: 4 * scale,
            }}>
              {['단지명', '청약기간', '세대수'].map(h => (
                <div key={h} style={{ ...s(12), color: '#9ca3af', fontWeight: 700 }}>{h}</div>
              ))}
            </div>
            {(items as SaleItem[]).map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 0.6fr 0.45fr',
                padding: `${8 * scale}px 0`,
                borderBottom: `${1 * scale}px solid #f3f4f6`,
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ ...s(15), fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 * scale }}>{item.name}</div>
                  <div style={{ ...s(11), color: '#6b7280', marginTop: 1 * scale }}>{item.location.split(' ').slice(0, 2).join(' ')}</div>
                </div>
                <div style={{ ...s(12), color: '#1d4ed8', fontWeight: 600 }}>
                  {item.receiptStart && item.receiptEnd ? fmtDateRange(item.receiptStart, item.receiptEnd) : item.status}
                </div>
                <div style={{ ...s(13), color: '#374151', fontWeight: 600 }}>
                  {item.totalUnits ? `${item.totalUnits.toLocaleString()}세대` : '-'}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 0.5fr',
              padding: `${6 * scale}px 0`, borderBottom: `${1 * scale}px solid #e5e7eb`,
              marginBottom: 4 * scale,
            }}>
              {['단지명', '분양가'].map(h => (
                <div key={h} style={{ ...s(12), color: '#9ca3af', fontWeight: 700 }}>{h}</div>
              ))}
            </div>
            {(items as UnsoldItem[]).map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 0.5fr',
                padding: `${8 * scale}px 0`,
                borderBottom: `${1 * scale}px solid #f3f4f6`,
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ ...s(15), fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 540 * scale }}>{item.name}</div>
                  <div style={{ ...s(11), color: '#6b7280', marginTop: 1 * scale }}>{item.location.split(' ').slice(0, 2).join(' ')}</div>
                </div>
                <div style={{ ...s(13), fontWeight: 700, color: '#059669' }}>
                  {item.min_price || item.max_price
                    ? `${fmt만원(item.min_price ?? item.max_price!)}~`
                    : '문의'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 푸터 */}
      <div style={{
        background: '#1e293b',
        padding: `${14 * scale}px ${36 * scale}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ ...s(14), color: '#94a3b8', fontWeight: 600 }}>aptzipsa.kr</div>
        <div style={{ ...s(12), color: '#64748b' }}>#아파트집사 #분양정보 #{type === '청약일정' ? '청약일정' : '미분양'}</div>
      </div>
    </div>
  );
}
