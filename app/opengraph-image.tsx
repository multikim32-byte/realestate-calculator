import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '청약정보 & 실거래가 — 전국 아파트·오피스텔 분양 청약 정보';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 20 }}>📋</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#fff', marginBottom: 16, textAlign: 'center' }}>
          청약정보 & 실거래가
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', marginBottom: 32, textAlign: 'center' }}>
          전국 아파트·오피스텔 청약 일정 · 인근 실거래가
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: '14px 32px',
          fontSize: 22,
          color: '#fff',
          fontWeight: 600,
        }}>
          청약달력 · 실거래가 조회 · 부동산 계산기
        </div>
      </div>
    ),
    { ...size }
  );
}
