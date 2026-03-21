import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '부동산 계산기 — 취득세·대출·중도금·중개수수료 무료 계산';
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
        <div style={{ fontSize: 72, marginBottom: 20 }}>🏠</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#fff', marginBottom: 16, textAlign: 'center' }}>
          부동산 계산기
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)', marginBottom: 32, textAlign: 'center' }}>
          취득세 · 대출 · 중도금 · 중개수수료 · 수익률
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: '14px 32px',
          fontSize: 22,
          color: '#fff',
          fontWeight: 600,
        }}>
          2025년 최신 세율 반영 · 무료 계산
        </div>
      </div>
    ),
    { ...size }
  );
}
