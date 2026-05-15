'use client';

import { useState, useCallback } from 'react';

type SaleItem = {
  name: string;
  location: string;
  receiptEnd?: string;
  receiptStart?: string;
  winnerDate?: string;
};

type UnsoldItem = {
  name: string;
  location: string;
  category: string;
  min_price: number | null;
  max_price: number | null;
  highlight: string | null;
};

interface Props {
  ongoingItems: SaleItem[];
  closingSoonItems: SaleItem[];
  upcomingItems: SaleItem[];
  unsoldItems: UnsoldItem[];
  today: string;
}

function shortLocation(loc: string): string {
  const parts = loc.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

function formatPrice(min: number | null, max: number | null): string {
  if (!min && !max) return '';
  const fmt = (p: number) => {
    if (p >= 10000) return `${(p / 10000).toFixed(1).replace(/\.0$/, '')}억`;
    return `${Math.round(p / 1000)}천만`;
  };
  if (min && max && min !== max) return `${fmt(min)}~${fmt(max)}`;
  if (min) return `${fmt(min)}~`;
  if (max) return `~${fmt(max)}`;
  return '';
}

function generateText(props: Props): string {
  const { ongoingItems, closingSoonItems, upcomingItems, unsoldItems, today } = props;
  const [, month, day] = today.split('-');
  const dateStr = `${parseInt(month)}월 ${parseInt(day)}일`;

  const lines: string[] = [];
  lines.push(`📋 오늘의 청약 일정 (${dateStr})`);
  lines.push('');

  if (closingSoonItems.length > 0) {
    lines.push('🔴 마감 임박 (3일 이내)');
    for (const it of closingSoonItems) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptEnd) lines.push(`    ⏰ ${it.receiptEnd.slice(5).replace('-', '/')} 마감`);
    }
    lines.push('');
  }

  if (ongoingItems.length > 0) {
    lines.push('🔵 청약 진행 중');
    for (const it of ongoingItems) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
    }
    lines.push('');
  }

  if (upcomingItems.length > 0) {
    lines.push('🟢 청약 예정 (7일 이내)');
    for (const it of upcomingItems) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptStart) lines.push(`    📅 ${it.receiptStart.slice(5).replace('-', '/')} 시작`);
    }
    lines.push('');
  }

  if (ongoingItems.length === 0 && closingSoonItems.length === 0 && upcomingItems.length === 0) {
    lines.push('현재 진행·예정 중인 청약 일정이 없습니다.');
    lines.push('');
  }

  if (unsoldItems.length > 0) {
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('🏠 주목할 미분양 매물');
    for (const it of unsoldItems) {
      lines.push(`  · ${it.name}`);
      const priceStr = formatPrice(it.min_price, it.max_price);
      const detail = [shortLocation(it.location), it.category, priceStr].filter(Boolean).join(' | ');
      if (detail) lines.push(`    ${detail}`);
      if (it.highlight) lines.push(`    ✅ ${it.highlight}`);
    }
    lines.push('');
  }

  lines.push('👉 전체 청약 정보 → https://www.aptzipsa.kr');
  lines.push('📌 채널 추가하고 매일 받아보기 → https://pf.kakao.com/_WYwjn');

  return lines.join('\n');
}

export default function KakaoContentClient(props: Props) {
  const [text, setText] = useState(() => generateText(props));
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    setText(generateText(props));
    setCopied(false);
  }, [props]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const charCount = text.length;
  const isLong = charCount > 1000;

  return (
    <div>
      {/* 데이터 현황 뱃지 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {props.closingSoonItems.length > 0 && (
          <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            🔴 마감임박 {props.closingSoonItems.length}건
          </span>
        )}
        {props.ongoingItems.length > 0 && (
          <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            🔵 청약중 {props.ongoingItems.length}건
          </span>
        )}
        {props.upcomingItems.length > 0 && (
          <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            🟢 예정 {props.upcomingItems.length}건
          </span>
        )}
        {props.unsoldItems.length > 0 && (
          <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            🏠 미분양 {props.unsoldItems.length}건
          </span>
        )}
      </div>

      {/* 텍스트 편집 영역 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{
          background: '#fefce8', padding: '12px 16px',
          borderBottom: '1px solid #fef08a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#854d0e' }}>💛 카카오 채널 소식 텍스트</span>
          <button
            onClick={regenerate}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 6,
              border: '1px solid #fef08a', background: '#fff',
              color: '#854d0e', cursor: 'pointer', fontWeight: 700,
            }}
          >
            ↺ 다시 생성
          </button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={22}
          style={{
            width: '100%', padding: '16px', border: 'none', outline: 'none',
            fontSize: 14, lineHeight: 1.9, fontFamily: '"Noto Sans KR", monospace',
            resize: 'vertical', boxSizing: 'border-box', color: '#1e293b',
          }}
        />

        <div style={{
          padding: '10px 16px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: isLong ? '#dc2626' : '#9ca3af', fontWeight: isLong ? 700 : 400 }}>
            {charCount.toLocaleString()}자{isLong ? ' — 1,000자 초과 (카카오 채널 소식 권장 이내 권장)' : ''}
          </span>
          <button
            onClick={copy}
            style={{
              padding: '9px 22px', borderRadius: 8, border: 'none',
              background: copied ? '#16a34a' : '#FEE500',
              color: copied ? '#fff' : '#3C1E1E',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {copied ? '✓ 복사됨!' : '📋 복사하기'}
          </button>
        </div>
      </div>

      {/* 채널 관리자 링크 */}
      <div style={{
        marginTop: 16, background: '#fff', borderRadius: 12,
        border: '1px solid #e5e7eb', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>채널 관리자 센터에서 소식 발행</p>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>소식 → 새 소식 작성 → 붙여넣기 → 발행</p>
        </div>
        <a
          href="https://center-pf.kakao.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '9px 18px', borderRadius: 8, background: '#FEE500',
            color: '#3C1E1E', textDecoration: 'none', fontWeight: 800,
            fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          채널 관리자 →
        </a>
      </div>

      {/* 발행 팁 */}
      <div style={{ marginTop: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#0369a1' }}>💡 발행 팁</p>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#374151', lineHeight: 2.1 }}>
          <li>채널 소식은 팔로워 전체에게 무료 발송됩니다.</li>
          <li>이미지를 함께 첨부하면 클릭률이 높아집니다.</li>
          <li>오전 8~9시 또는 오후 7~9시 발행이 효과적입니다.</li>
          <li>텍스트를 자유롭게 수정 후 복사하세요.</li>
        </ul>
      </div>
    </div>
  );
}
