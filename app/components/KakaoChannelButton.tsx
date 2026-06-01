'use client';

const CHANNEL_URL = 'https://pf.kakao.com/_xkfKGX';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function KakaoChannelButton({ size = 'md', label = '카카오 채널 추가' }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 10px', fontSize: 12, gap: 5, borderRadius: 7 },
    md: { padding: '8px 16px', fontSize: 13, gap: 6, borderRadius: 8 },
    lg: { padding: '12px 22px', fontSize: 15, gap: 8, borderRadius: 10 },
  };

  return (
    <a
      href={CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center',
        background: '#FEE500', color: '#3C1E1E',
        textDecoration: 'none', fontWeight: 700,
        ...styles[size],
      }}
    >
      {/* 카카오 말풍선 아이콘 */}
      <svg width={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} height={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} viewBox="0 0 24 24" fill="#3C1E1E">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.523 5.09 3.857 6.562L4.5 21l4.286-2.143A11.6 11.6 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
      </svg>
      {label}
    </a>
  );
}
