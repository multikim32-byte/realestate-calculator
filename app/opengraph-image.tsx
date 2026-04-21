import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '청약정보 & 실거래가 — 전국 부동산 정보';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative',
      }}>
        {/* 상단 라벨 */}
        <div style={{
          fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          letterSpacing: 2, marginBottom: 24, textTransform: 'uppercase',
          display: 'flex',
        }}>
          국토교통부 공공데이터 기반
        </div>

        {/* 메인 타이틀 */}
        <div style={{
          fontSize: 80, fontWeight: 900, color: '#fff',
          marginBottom: 20, textAlign: 'center', lineHeight: 1.15,
          display: 'flex',
        }}>
          전국 부동산 정보
        </div>

        {/* 서브타이틀 */}
        <div style={{
          fontSize: 30, color: 'rgba(255,255,255,0.85)',
          marginBottom: 56, textAlign: 'center',
          display: 'flex',
        }}>
          청약 일정 · 실거래가 · 분양정보 · 계산기까지 무료로
        </div>

        {/* 기능 카드 6개 */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: '청약달력', sub: '일정 한눈에' },
            { label: '실거래가', sub: '시세 조회' },
            { label: '계산기', sub: '취득세·대출' },
            { label: '분양정보', sub: '미분양 매물' },
            { label: '임대정보', sub: 'LH 임대공고' },
            { label: '지역별', sub: '시도별 보기' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 16, padding: '18px 22px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', minWidth: 140,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginTop: 4, display: 'flex' }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        {/* 도메인 */}
        <div style={{
          position: 'absolute', bottom: 36,
          fontSize: 20, color: 'rgba(255,255,255,0.45)',
          display: 'flex',
        }}>
          www.mk-land.kr
        </div>
      </div>
    ),
    { ...size }
  );
}
