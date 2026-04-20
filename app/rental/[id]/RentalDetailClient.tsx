'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import GlobalNav from '../../components/GlobalNav';
import { LhRentalItem, LhAttachment } from '@/lib/lhApi';

const RENTAL_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  '행복주택':     { bg: '#e0f2fe', color: '#0369a1' },
  '국민임대':     { bg: '#d1fae5', color: '#065f46' },
  '통합공공임대': { bg: '#ede9fe', color: '#5b21b6' },
  '장기전세':     { bg: '#fef3c7', color: '#92400e' },
  '영구임대':     { bg: '#fce7f3', color: '#9d174d' },
  '공공임대':     { bg: '#f3f4f6', color: '#374151' },
  '매입임대':     { bg: '#fff7ed', color: '#c2410c' },
  '전세임대':     { bg: '#ecfdf5', color: '#047857' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '모집예정': { bg: '#e8f0fe', color: '#1a56db' },
  '모집중':   { bg: '#d1fae5', color: '#065f46' },
  '모집마감': { bg: '#f3f4f6', color: '#6b7280' },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '11px 0' }}>
      <dt style={{ width: 120, flexShrink: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{value || '-'}</dd>
    </div>
  );
}

export default function RentalDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LhRentalItem | null>(null);
  const [attachments, setAttachments] = useState<LhAttachment[]>([]);

  useEffect(() => {
    if (!id) return;
    try {
      const cached = sessionStorage.getItem(`rental_item_${id}`);
      if (cached) {
        const parsed: LhRentalItem = JSON.parse(cached);
        setItem(parsed);
        // 첨부파일 로드
        const qs = new URLSearchParams({
          panId:    parsed.ccrCnt,
          ccrCd:    parsed.ccrCnntSysDsCd || '03',
          uppTpCd:  parsed.uppAisTpCd,
          aisTpCd:  parsed.aisTpCd,
        });
        fetch(`/api/rental/attachments?${qs}`)
          .then(r => r.json())
          .then(d => setAttachments(d.attachments ?? []))
          .catch(() => {});
      }
    } catch {}
  }, [id]);

  if (!item) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
        <GlobalNav />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: '#9ca3af' }}>
          <p>공고 정보를 불러올 수 없습니다.</p>
          <Link href="/rental" style={{ color: '#1d4ed8', fontSize: 14 }}>← 임대정보 목록으로</Link>
        </div>
      </div>
    );
  }

  const typeStyle   = RENTAL_TYPE_COLORS[item.rentalType] ?? { bg: '#f3f4f6', color: '#374151' };
  const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE['모집마감'];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* 뒤로가기 */}
        <Link href="/rental" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← 임대정보 목록
        </Link>

        {/* 헤더 카드 */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color }}>
              {item.status}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: typeStyle.bg, color: typeStyle.color }}>
              {item.rentalType}
            </span>
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.4 }}>
            {item.name}
          </h1>
          {item.location && (
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>📍 {item.location}</p>
          )}
        </div>

        {/* 일정 정보 */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>공고 일정</h2>
          <dl style={{ margin: 0 }}>
            <Row label="공고 게시일"  value={item.announcementDate} />
            <Row label="접수 시작"    value={item.receiptStart} />
            <Row label="접수 마감"    value={item.receiptEnd} />
            {item.winnerDate    && <Row label="발표일"     value={item.winnerDate} />}
            {item.contractStart && <Row label="계약 시작"  value={item.contractStart} />}
            {item.contractEnd   && <Row label="계약 종료"  value={item.contractEnd} />}
            {item.moveInDate    && <Row label="입주 예정"  value={item.moveInDate.slice(0, 7)} />}
          </dl>
        </div>

        {/* 공고 기본 정보 */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>공고 기본정보</h2>
          <dl style={{ margin: 0 }}>
            <Row label="임대 유형" value={item.rentalType} />
            <Row label="지역"     value={item.region} />
            {item.totalUnits > 0 && <Row label="공급 세대수" value={`${item.totalUnits.toLocaleString()}세대`} />}
            {item.contact && <Row label="문의전화" value={item.contact} />}
          </dl>
        </div>

        {/* 공고 첨부파일 */}
        {attachments.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1e3a5f' }}>공고 첨부파일</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    background: att.type === 'pdf' ? '#fef2f2' : att.type === 'hwp' ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${att.type === 'pdf' ? '#fecaca' : att.type === 'hwp' ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: 10, textDecoration: 'none',
                    color: att.type === 'pdf' ? '#dc2626' : att.type === 'hwp' ? '#16a34a' : '#374151',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{att.type === 'pdf' ? '📄' : att.type === 'hwp' ? '📝' : '📎'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.type === 'pdf' ? 'PDF 공고문 보기' : att.type === 'hwp' ? 'HWP 공고문 다운로드' : att.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{att.type.toUpperCase()} ↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 안내 박스 */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>
          주택형별 보증금·월임대료 등 상세 공급정보는 공고문 또는 LH청약플러스에서 확인하세요.
        </div>

        {/* LH 공식 링크 버튼 */}
        {item.pblancUrl && (
          <a
            href={item.pblancUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#475569', borderRadius: 12,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}
          >
            🔗 LH청약플러스 공고문 페이지
          </a>
        )}
      </div>
    </div>
  );
}
