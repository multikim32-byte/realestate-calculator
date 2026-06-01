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

type TradeStatItem = {
  rank: number;
  name: string;
  dong: string;
  location: string;
  areaBucket?: number;
  currentAvg?: number;
  prevAvg?: number;
  changePct?: number;
  count?: number;
  price?: number;
  dealDate?: string;
  area?: number;
  floor?: number;
  avgPrice?: number;
};

type TradeStats = {
  stat_date: string;
  current_month: string;
  prev_month: string;
  rising: TradeStatItem[];
  falling: TradeStatItem[];
  top_price: TradeStatItem[];
  top_volume: TradeStatItem[];
} | null;

interface Props {
  ongoingItems: SaleItem[];
  closingSoonItems: SaleItem[];
  upcomingItems: SaleItem[];
  unsoldItems: UnsoldItem[];
  weeklyItems: SaleItem[];
  thisWeekStart: string;
  thisWeekEnd: string;
  today: string;
  tradeStats: TradeStats;
}

function shortLocation(loc: string): string {
  return loc.trim().split(/\s+/).slice(0, 2).join(' ');
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

function fmt만원(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, '')}억`;
  if (v >= 1000)  return `${Math.round(v / 1000)}천만`;
  return `${v.toLocaleString()}만`;
}

function generateSaleText(props: Props): string {
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

  lines.push('👉 전체 청약 정보 → https://www.danjizipsa.kr');
  lines.push('📌 채널 추가하고 매일 받아보기 → https://pf.kakao.com/_xkfKGX');

  return lines.join('\n');
}

function fmtWeekDay(d: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const [, m, day] = d.split('-');
  const date = new Date(d + 'T00:00:00');
  return `${parseInt(m)}/${parseInt(day)}(${days[date.getDay()]})`;
}

function generateWeeklyText(items: SaleItem[], thisWeekStart: string, thisWeekEnd: string, today: string): string {
  const weekLabel = `${fmtWeekDay(thisWeekStart)}~${fmtWeekDay(thisWeekEnd)}`;

  const lines: string[] = [];
  lines.push(`📋 이번주 청약 소식 (${weekLabel})`);
  lines.push('');

  const closingThisWeek = items
    .filter(it => it.receiptEnd && it.receiptEnd >= thisWeekStart && it.receiptEnd <= thisWeekEnd)
    .sort((a, b) => (a.receiptEnd ?? '').localeCompare(b.receiptEnd ?? ''));

  const startingThisWeek = items
    .filter(it => it.receiptStart && it.receiptStart >= today && it.receiptStart <= thisWeekEnd)
    .sort((a, b) => (a.receiptStart ?? '').localeCompare(b.receiptStart ?? ''));

  const alreadyStartedThisWeek = items
    .filter(it => it.receiptStart && it.receiptStart >= thisWeekStart && it.receiptStart < today)
    .sort((a, b) => (a.receiptStart ?? '').localeCompare(b.receiptStart ?? ''));

  const ongoingAllWeek = items
    .filter(it => (it.receiptStart ?? '') < thisWeekStart && (it.receiptEnd ?? '') > thisWeekEnd);

  if (closingThisWeek.length > 0) {
    lines.push('🔴 이번주 마감');
    for (const it of closingThisWeek) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptEnd) lines.push(`    ⏰ ${fmtWeekDay(it.receiptEnd)} 마감`);
    }
    lines.push('');
  }

  if (startingThisWeek.length > 0) {
    lines.push('🟢 이번주 청약 시작 예정');
    for (const it of startingThisWeek) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptStart) lines.push(`    📅 ${fmtWeekDay(it.receiptStart)} 시작`);
    }
    lines.push('');
  }

  if (alreadyStartedThisWeek.length > 0) {
    lines.push('🟡 이번주 청약 시작');
    for (const it of alreadyStartedThisWeek) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptStart) lines.push(`    📅 ${fmtWeekDay(it.receiptStart)} 시작`);
    }
    lines.push('');
  }

  if (ongoingAllWeek.length > 0) {
    lines.push('🔵 계속 진행 중');
    for (const it of ongoingAllWeek) {
      lines.push(`  · ${it.name} — ${shortLocation(it.location)}`);
      if (it.receiptEnd) lines.push(`    ${fmtWeekDay(it.receiptEnd)} 마감`);
    }
    lines.push('');
  }

  if (items.length === 0) {
    lines.push('이번주 청약 일정이 없습니다.');
    lines.push('');
  }

  lines.push('👉 전체 청약 정보 → https://www.danjizipsa.kr');
  lines.push('📌 채널 추가하고 매일 받아보기 → https://pf.kakao.com/_xkfKGX');

  return lines.join('\n');
}

function generateTradeText(stats: TradeStats): string {
  if (!stats) return '집계된 실거래 데이터가 없습니다.\nGitHub Actions가 매일 03:00 KST에 자동 집계합니다.';

  const ym = stats.current_month;
  const monthLabel = `${ym.slice(0, 4)}년 ${parseInt(ym.slice(4))}월`;

  const lines: string[] = [];
  lines.push(`📊 전국 실거래 동향 (${monthLabel})`);
  lines.push('');

  // 급등 TOP 5
  if (stats.rising.length > 0) {
    lines.push('📈 이번달 급등 단지 TOP 5');
    for (const it of stats.rising.slice(0, 5)) {
      const pct = it.changePct != null ? (it.changePct > 0 ? `+${it.changePct}%` : `${it.changePct}%`) : '';
      lines.push(`  ${it.rank}. ${it.name} (${it.location} ${it.dong}${it.areaBucket ? `, ${it.areaBucket}㎡` : ''})`);
      if (it.currentAvg && it.prevAvg) {
        lines.push(`     ${pct} — ${fmt만원(it.prevAvg)} → ${fmt만원(it.currentAvg)}`);
      }
    }
    lines.push('');
  }

  // 급락 TOP 5
  if (stats.falling.length > 0) {
    lines.push('📉 이번달 급락 단지 TOP 5');
    for (const it of stats.falling.slice(0, 5)) {
      const pct = it.changePct != null ? `${it.changePct}%` : '';
      lines.push(`  ${it.rank}. ${it.name} (${it.location} ${it.dong}${it.areaBucket ? `, ${it.areaBucket}㎡` : ''})`);
      if (it.currentAvg && it.prevAvg) {
        lines.push(`     ${pct} — ${fmt만원(it.prevAvg)} → ${fmt만원(it.currentAvg)}`);
      }
    }
    lines.push('');
  }

  // 신고가 TOP 5
  if (stats.top_price.length > 0) {
    lines.push('🏆 이번달 신고가 거래 TOP 5');
    for (const it of stats.top_price.slice(0, 5)) {
      lines.push(`  ${it.rank}. ${it.name} — ${it.price != null ? fmt만원(it.price) : '-'}`);
      lines.push(`     ${it.location} ${it.dong}${it.area ? ` · ${it.area}㎡` : ''}${it.floor ? ` · ${it.floor}층` : ''}`);
    }
    lines.push('');
  }

  // 거래량 TOP 5
  if (stats.top_volume.length > 0) {
    lines.push('🔥 이번달 거래 많은 단지 TOP 5');
    for (const it of stats.top_volume.slice(0, 5)) {
      lines.push(`  ${it.rank}. ${it.name} ${it.count != null ? `${it.count}건` : ''} (${it.location} ${it.dong})`);
      if (it.avgPrice) lines.push(`     평균 ${fmt만원(it.avgPrice)}`);
    }
    lines.push('');
  }

  lines.push(`집계일: ${stats.stat_date}`);
  lines.push('👉 실거래가 조회 → https://www.danjizipsa.kr/trade');
  lines.push('📌 채널 추가하고 매일 받아보기 → https://pf.kakao.com/_xkfKGX');

  return lines.join('\n');
}

export default function KakaoContentClient(props: Props) {
  const { tradeStats, weeklyItems, thisWeekStart, thisWeekEnd, today } = props;
  const [tab, setTab] = useState<'sale' | 'weekly' | 'trade'>('sale');
  const [saleText, setSaleText] = useState(() => generateSaleText(props));
  const [weeklyText, setWeeklyText] = useState(() => generateWeeklyText(weeklyItems, thisWeekStart, thisWeekEnd, today));
  const [tradeText, setTradeText] = useState(() => generateTradeText(tradeStats));
  const [copied, setCopied] = useState(false);

  const text = tab === 'sale' ? saleText : tab === 'weekly' ? weeklyText : tradeText;
  const setText = tab === 'sale' ? setSaleText : tab === 'weekly' ? setWeeklyText : setTradeText;

  const regenerate = useCallback(() => {
    if (tab === 'sale') setSaleText(generateSaleText(props));
    else if (tab === 'weekly') setWeeklyText(generateWeeklyText(weeklyItems, thisWeekStart, thisWeekEnd, today));
    else setTradeText(generateTradeText(tradeStats));
    setCopied(false);
  }, [props, tradeStats, weeklyItems, thisWeekStart, thisWeekEnd, today, tab]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setTab('sale'); setCopied(false); }}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'sale' ? '#1d4ed8' : '#f1f5f9',
            color: tab === 'sale' ? '#fff' : '#374151',
            fontSize: 14, fontWeight: 700,
          }}
        >
          📅 오늘의 청약 소식
        </button>
        <button
          onClick={() => { setTab('weekly'); setCopied(false); }}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'weekly' ? '#0891b2' : '#ecfeff',
            color: tab === 'weekly' ? '#fff' : '#0e7490',
            fontSize: 14, fontWeight: 700,
          }}
        >
          🗓️ 이번주 청약 소식
          <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{weeklyItems.length}건</span>
        </button>
        <button
          onClick={() => { setTab('trade'); setCopied(false); }}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === 'trade' ? '#7c3aed' : '#f5f3ff',
            color: tab === 'trade' ? '#fff' : '#5b21b6',
            fontSize: 14, fontWeight: 700,
          }}
        >
          📊 실거래 소식
          {!tradeStats && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>미집계</span>}
        </button>
      </div>

      {/* 데이터 현황 뱃지 (청약 탭) */}
      {tab === 'sale' && (
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
      )}

      {/* 이번주 청약 탭 뱃지 */}
      {tab === 'weekly' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ background: '#ecfeff', color: '#0e7490', border: '1px solid #a5f3fc', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            🗓️ {fmtWeekDay(thisWeekStart)} ~ {fmtWeekDay(thisWeekEnd)}
          </span>
          {weeklyItems.length > 0 && (
            <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
              총 {weeklyItems.length}건
            </span>
          )}
        </div>
      )}

      {/* 실거래 탭 정보 뱃지 */}
      {tab === 'trade' && tradeStats && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
            📊 {tradeStats.current_month.slice(0,4)}년 {parseInt(tradeStats.current_month.slice(4))}월 기준 · 집계일 {tradeStats.stat_date}
          </span>
        </div>
      )}

      {/* 텍스트 편집 영역 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{
          background: tab === 'sale' ? '#fefce8' : tab === 'weekly' ? '#ecfeff' : '#f5f3ff',
          padding: '12px 16px',
          borderBottom: `1px solid ${tab === 'sale' ? '#fef08a' : tab === 'weekly' ? '#a5f3fc' : '#ddd6fe'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: tab === 'sale' ? '#854d0e' : tab === 'weekly' ? '#0e7490' : '#5b21b6' }}>
            {tab === 'sale' ? '💛 카카오 채널 소식 텍스트 (오늘 청약)' : tab === 'weekly' ? '🩵 카카오 채널 소식 텍스트 (이번주 청약)' : '💜 카카오 채널 소식 텍스트 (실거래)'}
          </span>
          <button
            onClick={regenerate}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 6,
              border: `1px solid ${tab === 'sale' ? '#fef08a' : tab === 'weekly' ? '#a5f3fc' : '#ddd6fe'}`,
              background: '#fff',
              color: tab === 'sale' ? '#854d0e' : tab === 'weekly' ? '#0e7490' : '#5b21b6',
              cursor: 'pointer', fontWeight: 700,
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
          <li>실거래 소식은 인스타 카드(급등/급락/신고가/거래량)와 함께 발행하면 좋습니다.</li>
        </ul>
      </div>
    </div>
  );
}
