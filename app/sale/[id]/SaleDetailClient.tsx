'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GlobalNav from '../../components/GlobalNav';
import KakaoMap from '../../components/KakaoMap';
import NearbyTradeSection from '../../components/NearbyTradeSection';
import CompetitionRateSection from '../../components/CompetitionRateSection';
import SpecialSupplySection from '../../components/SpecialSupplySection';
import type { SaleContent } from '@/lib/saleContent';

type UnitDetail = { type: string; area: number; supplyArea?: number; count: number; specialCount?: number; price: number };

function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

type SaleDetail = {
  id: string;
  name: string;
  location: string;
  region: string;
  district: string;
  buildingType: string;
  supplyType: string;
  recruitType: string;
  totalUnits: number;
  specialSupplyUnits?: number;
  minPrice: number;
  maxPrice: number;
  receiptStart: string;
  receiptEnd: string;
  announcementDate: string;
  winnerDate: string;
  contractStart?: string;
  contractEnd?: string;
  moveInDate: string;
  status: string;
  floors: number;
  businessEntity?: string;
  constructionCompany?: string;
  contact?: string;
  subscriptionArea?: string;
  units: UnitDetail[];
  pblancUrl?: string;
  houseManageNo?: string;
  pblancNo?: string;
};

function MgmForm({ houseManageNo, aptName }: { houseManageNo: string; aptName: string }) {
  const [form, setForm] = useState({ name: '', birth_date: '', phone: '', address: '' });
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError('성함을 2자 이상 입력해주세요.'); return; }
    if (!/^\d{8}$/.test(form.birth_date.replace(/-/g, ''))) { setError('생년월일을 8자리 숫자로 입력해주세요. (예: 19901215)'); return; }
    if (!/^0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}$/.test(form.phone.trim())) { setError('올바른 전화번호를 입력해주세요. (예: 010-1234-5678)'); return; }
    if (form.address.trim().length < 5) { setError('거주지를 동까지 정확히 입력해주세요.'); return; }
    if (!consentPrivacy || !consentThirdParty) {
      setError('필수 동의 항목에 모두 동의해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/mgm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_manage_no: houseManageNo, ...form }),
    });
    setSubmitting(false);
    if (res.ok) { setDone(true); }
    else { const d = await res.json(); setError(d.error || '신청 실패. 다시 시도해주세요.'); }
  };

  if (done) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '32px', marginTop: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#166534', margin: '0 0 6px' }}>MGM 신청이 완료됐습니다!</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>담당자가 확인 후 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '2px solid #1d4ed8', borderRadius: 16, padding: '28px', marginTop: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>MGM 신청</span>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: '10px 0 4px' }}>{aptName}</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>청약자 정보를 입력하시면 담당자가 연락드립니다.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>청약자 성함 *</label>
            <input
              required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="홍길동"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>생년월일 *</label>
            <input
              required value={form.birth_date} onChange={e => set('birth_date', e.target.value)}
              placeholder="예: 19901215"
              maxLength={8}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>전화번호 *</label>
          <input
            required value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="010-1234-5678"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>거주지 (동까지) *</label>
          <input
            required value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="예: 경기도 성남시 분당구 정자동"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' as const }}
          />
        </div>
        {/* 개인정보 동의 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={consentPrivacy} onChange={e => setConsentPrivacy(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#dc2626' }}>[필수]</strong> 개인정보 수집·이용에 동의합니다.{' '}
              <button type="button" onClick={() => setShowPrivacy(v => !v)} style={{ fontSize: 11, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {showPrivacy ? '접기' : '상세보기'}
              </button>
            </span>
          </label>
          {showPrivacy && (
            <div style={{ fontSize: 11, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', lineHeight: 1.8 }}>
              · 수집 항목: 성명, 생년월일, 전화번호, 거주지<br />
              · 수집 목적: {aptName} 분양 상담 연락<br />
              · 보유 기간: 분양 종료 시까지 보유, 목적 달성 시 폐기<br />
              · 동의 거부 시 MGM 신청이 불가합니다.
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={consentThirdParty} onChange={e => setConsentThirdParty(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#dc2626' }}>[필수]</strong> 개인정보 제3자 제공에 동의합니다.{' '}
              <button type="button" onClick={() => setShowThirdParty(v => !v)} style={{ fontSize: 11, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {showThirdParty ? '접기' : '상세보기'}
              </button>
            </span>
          </label>
          {showThirdParty && (
            <div style={{ fontSize: 11, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', lineHeight: 1.8 }}>
              · 제공받는 자: {aptName} 시행사 및 분양대행사<br />
              · 제공 목적: 분양 상담 및 안내<br />
              · 제공 항목: 성명, 생년월일, 전화번호, 거주지<br />
              · 보유 기간: 분양 종료 시까지 보유, 목적 달성 시 폐기<br />
              · 동의 거부 시 MGM 신청이 불가합니다.
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>}
        <button
          type="submit" disabled={submitting}
          style={{
            padding: '13px', borderRadius: 10, border: 'none',
            background: submitting ? '#93c5fd' : '#1d4ed8',
            color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '신청 중...' : 'MGM 신청하기'}
        </button>
      </form>
    </div>
  );
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  '청약예정':   { bg: '#dbeafe', color: '#1d4ed8' },
  '청약중':     { bg: '#d1fae5', color: '#065f46' },
  '당첨발표':   { bg: '#fef3c7', color: '#92400e' },
  '선착순분양': { bg: '#fce7f3', color: '#9d174d' },
  '청약마감':   { bg: '#f3f4f6', color: '#6b7280' },
};

function formatPrice(p: number) {
  if (!p) return '미정';
  const eok = Math.floor(p / 10000);
  const rest = p % 10000;
  if (eok > 0 && rest > 0) return `${eok}억 ${rest.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${p.toLocaleString()}만원`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
      <dt style={{ width: 130, flexShrink: 0, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{value || '-'}</dd>
    </div>
  );
}

type UnsoldLink = { id: string; name: string; thumbnail_url: string | null; benefit: string | null; min_price: number | null };


export default function SaleDetailClient({ content }: { content: SaleContent | null }) {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unsoldLink, setUnsoldLink] = useState<UnsoldLink | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lightboxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const resetZoom = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);
  const closeLightbox = useCallback(() => { setLightbox(null); resetZoom(); }, [resetZoom]);
  const prevImage = useCallback(() => { setLightbox(lb => lb && lb.idx > 0 ? { ...lb, idx: lb.idx - 1 } : lb); resetZoom(); }, [resetZoom]);
  const nextImage = useCallback(() => { setLightbox(lb => lb && lb.idx < lb.urls.length - 1 ? { ...lb, idx: lb.idx + 1 } : lb); resetZoom(); }, [resetZoom]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.5));
      if (e.key === '-') setZoom(z => Math.max(1, z - 0.5));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, closeLightbox, prevImage, nextImage]);

  useEffect(() => {
    const el = lightboxRef.current;
    if (!lightbox || !el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(4, Math.max(1, z * (1 - e.deltaY * 0.002))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [lightbox]);

  useEffect(() => {
    if (!id) return;

    // 세션스토리지 캐시는 즉시 표시용으로만 사용 (스켈레톤 대체)
    let fallback: SaleDetail | null = null;
    try {
      const cached = sessionStorage.getItem(`sale_item_${id}`);
      if (cached) {
        fallback = JSON.parse(cached);
        setItem(fallback);   // 즉시 화면에 표시
        setLoading(false);
      }
    } catch { /* 무시 */ }

    // 항상 API에서 최신 데이터를 가져와 갱신
    fetchDetail(id, fallback);

    // 연결된 미분양 매물 조회
    fetch(`/api/unsold/by-sale?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data.item) setUnsoldLink(data.item); })
      .catch(() => {});
  }, [id]);

  async function fetchDetail(houseManageNo: string, fallback: SaleDetail | null) {
    try {
      // API route에서 상세 조회
      const res = await fetch(`/api/sale/detail?id=${houseManageNo}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      if (data.item) {
        setItem(data.item);
      } else if (fallback) {
        // API에서 못 찾은 경우 캐시 유지 (이미 setItem 완료)
      } else {
        setError(true);
      }
    } catch {
      if (!fallback) setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏗️</div>
          <p>단지 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>단지 정보를 찾을 수 없습니다</h2>
          <p style={{ color: '#6b7280', margin: '0 0 20px' }}>존재하지 않거나 삭제된 단지입니다.</p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 10,
            background: '#1d4ed8', color: '#fff', textDecoration: 'none', fontWeight: 700,
          }}>← 청약정보로</Link>
        </div>
      </div>
    );
  }

  const ss = statusStyle[item.status] || statusStyle['청약마감'];

  return (
    <>
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      <GlobalNav />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* 타이틀 카드 */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '28px 28px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
              background: ss.bg, color: ss.color,
            }}>{item.status}</span>
            <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: 6 }}>{item.buildingType}</span>
            <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: 6 }}>{item.supplyType}</span>
            {item.recruitType === '선착순' && (
              <span style={{ fontSize: 12, background: '#fff0f6', color: '#c026d3', padding: '3px 10px', borderRadius: 6, border: '1px solid #f9a8d4' }}>선착순</span>
            )}
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{item.name}</h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>📍 {item.location}</p>

          {/* 핵심 정보 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: '총 세대수', value: `${item.totalUnits.toLocaleString()}세대` },
              { label: '분양가', value: item.minPrice ? `${formatPrice(item.minPrice)}~${formatPrice(item.maxPrice)}` : '미정' },
              { label: '접수기간', value: item.receiptStart ? `${item.receiptStart} ~ ${item.receiptEnd}` : '-' },
              { label: '당첨발표', value: item.winnerDate || '-' },
              { label: '입주예정', value: item.moveInDate || '-' },
              ...(item.floors ? [{ label: '최고층수', value: `${item.floors}층` }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* 버튼 영역 */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={item.pblancUrl ||
                `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${item.houseManageNo ?? item.id}&pblancNo=${item.pblancNo ?? ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: '#1d4ed8', color: '#fff', textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(29,78,216,0.3)',
              }}
            >
              📄 모집공고문 보기 (청약홈)
            </a>
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: document.title, url: window.location.href });
                else navigator.clipboard.writeText(window.location.href).then(() => alert('링크가 복사되었습니다.'));
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: '#fff', color: '#374151',
                border: '1px solid #e5e7eb', cursor: 'pointer',
              }}
            >
              🔗 공유하기
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* 상세 정보 */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px 24px 16px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>단지 상세정보</h2>
            <dl style={{ margin: 0 }}>
              <Row label="단지명" value={item.name} />
              <Row label="주소" value={item.location} />
              <Row label="건물유형" value={item.buildingType} />
              <Row label="공급유형" value={item.supplyType} />
              <Row label="모집유형" value={item.recruitType} />
              <Row label="총 세대수" value={`${item.totalUnits.toLocaleString()}세대`} />
              {(item.specialSupplyUnits ?? 0) > 0 && <Row label="특별공급 세대수" value={`${item.specialSupplyUnits!.toLocaleString()}세대`} />}
              {item.subscriptionArea ? <Row label="청약신청 지역" value={item.subscriptionArea} /> : null}
              {item.floors ? <Row label="최고층수" value={`${item.floors}층`} /> : null}
              {item.businessEntity ? <Row label="사업주체(시행사)" value={item.businessEntity} /> : null}
              {item.constructionCompany ? <Row label="건설사(시공사)" value={item.constructionCompany} /> : null}
              {item.contact ? <Row label="문의전화" value={item.contact} /> : null}
            </dl>
          </div>

          {/* 청약 일정 */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px 24px 16px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>청약 일정</h2>
            <dl style={{ margin: 0 }}>
              <Row label="모집공고일" value={item.announcementDate} />
              <Row label="청약접수 시작" value={item.receiptStart} />
              <Row label="청약접수 종료" value={item.receiptEnd} />
              <Row label="당첨자 발표" value={item.winnerDate} />
              {item.contractStart && <Row label="계약 시작" value={item.contractStart} />}
              {item.contractEnd && <Row label="계약 종료" value={item.contractEnd} />}
              <Row label="입주 예정" value={item.moveInDate} />
            </dl>
          </div>
        </div>

        {/* 에디토리얼 콘텐츠 */}
        {content && (content.thumbnail_url || content.summary || content.description || (content.pros?.length ?? 0) > 0 || (content.cons?.length ?? 0) > 0 || (content.image_urls?.length ?? 0) > 0) && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '28px', marginTop: 16 }}>
            {content.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.thumbnail_url}
                alt={item.name}
                style={{ width: '100%', height: 'auto', borderRadius: 12, marginBottom: 22, display: 'block' }}
              />
            )}
            {content.summary && (
              <p style={{
                fontSize: 15, lineHeight: 1.8, color: '#1e293b', fontWeight: 500,
                background: '#eff6ff', borderLeft: '4px solid #3b82f6',
                padding: '14px 18px', borderRadius: '0 8px 8px 0', margin: '0 0 20px',
              }}>
                {content.summary}
              </p>
            )}
            {content.description && (
              <div
                style={{ fontSize: 14, lineHeight: 1.9, color: '#374151' }}
                dangerouslySetInnerHTML={{ __html: content.description }}
              />
            )}
            {(content.pros?.length ?? 0) > 0 && (
              <div style={{ marginTop: 20, background: '#f0fdf4', borderRadius: 10, padding: '16px 20px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#065f46', margin: '0 0 10px' }}>✅ 장점</h2>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.9 }}>
                  {content.pros!.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {(content.cons?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12, background: '#fffbeb', borderRadius: 10, padding: '16px 20px' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#92400e', margin: '0 0 10px' }}>⚠️ 유의사항</h2>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.9 }}>
                  {content.cons!.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {(content.image_urls?.length ?? 0) > 0 && (
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {content.image_urls!.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`${item.name} 사진 ${i + 1}`}
                    loading="lazy"
                    onClick={() => setLightbox({ urls: content.image_urls!, idx: i })}
                    style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', cursor: 'zoom-in' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 유튜브 영상 */}
        {extractYoutubeId(content?.youtube_url) && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px', marginTop: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>📹 분양 영상</h2>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${extractYoutubeId(content!.youtube_url)}`}
                title="분양 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* MGM 신청 폼 */}
        {content?.mgm_enabled && <MgmForm houseManageNo={item.houseManageNo ?? item.id} aptName={item.name} />}

        {/* 공유하기 배너 */}
        <button
          onClick={() => {
            if (navigator.share) navigator.share({ title: document.title, url: window.location.href });
            else navigator.clipboard.writeText(window.location.href).then(() => alert('링크가 복사되었습니다.'));
          }}
          style={{
            width: '100%', marginTop: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '16px', borderRadius: 14,
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(245,158,11,0.35)',
          }}
        >
          <span style={{ fontSize: 20 }}>🔗</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#78350f' }}>이 청약정보 공유하기</span>
          <span style={{ fontSize: 13, color: '#92400e' }}>— 카카오·문자·링크 복사</span>
        </button>

        {/* 주택형별 */}
        {item.units && item.units.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px', marginTop: 16 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>주택형별 공급정보</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.units.map((u, i) => (
                <div key={i} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
                  background: i % 2 === 0 ? '#fff' : '#f8f9fa',
                }}>
                  {/* 주택형 헤더 */}
                  <div style={{
                    padding: '8px 14px', background: '#eff6ff',
                    borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>주택형</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>{u.type}</span>
                  </div>
                  {/* 정보 그리드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {[
                      { label: '전용면적(㎡)', value: u.area ? u.area.toFixed(2) : (parseFloat(u.type) ? parseFloat(u.type).toFixed(2) : '-') },
                      { label: '공급면적(㎡)', value: u.supplyArea ? u.supplyArea.toFixed(2) : '-' },
                      { label: '일반공급', value: u.count ? `${u.count.toLocaleString()}세대` : '-' },
                      { label: '특별공급', value: u.specialCount ? `${u.specialCount.toLocaleString()}세대` : '-' },
                    ].map(({ label, value }, j) => (
                      <div key={label} style={{
                        padding: '10px 6px', textAlign: 'center',
                        borderRight: j < 3 ? '1px solid #e5e7eb' : 'none',
                      }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', wordBreak: 'keep-all' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {/* 분양가 별도 행 */}
                  <div style={{ padding: '8px 14px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>분양가 상한</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>{u.price ? formatPrice(u.price) : '미정'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 특별공급 신청현황 */}
        {item.houseManageNo && (
          <SpecialSupplySection
            houseManageNo={item.houseManageNo}
            pblancNo={item.pblancNo ?? ''}
          />
        )}

        {/* 청약 경쟁률 결과 */}
        {item.houseManageNo && (
          <CompetitionRateSection
            houseManageNo={item.houseManageNo}
            pblancNo={item.pblancNo ?? ''}
            status={item.status}
            buildingType={item.buildingType}
            recruitType={item.recruitType}
          />
        )}

        {/* 연결된 미분양 매물 */}
        {unsoldLink && (
          <Link href={`/unsold/${unsoldLink.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              marginTop: 16, background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: 16, padding: '18px 24px', border: '1px solid #f59e0b',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 2px 12px rgba(245,158,11,0.2)',
            }}>
              {unsoldLink.thumbnail_url && (
                <Image src={unsoldLink.thumbnail_url} alt={unsoldLink.name}
                  width={72} height={56}
                  style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} unoptimized />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>🎁 특별 혜택 매물 등록됨</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{unsoldLink.name}</div>
                {unsoldLink.benefit && <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unsoldLink.benefit}</div>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>혜택 보기 →</div>
            </div>
          </Link>
        )}

        {/* 카카오 지도 */}
        {item.location && (
          <>
            <KakaoMap address={item.location} name={item.name} />
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Link href="/map" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                background: '#1d4ed8', color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
              }}>
                🗺️ 분양정보 지도로 보기 →
              </Link>
            </div>
          </>
        )}

        {/* 지역 분양 모아보기 배너 */}
        {item.region && (
          <div style={{ marginTop: 12, background: '#1e3a5f', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>📋 {item.region} 청약·분양 매물 모아보기</p>
            <a href={`/region/${encodeURIComponent(item.region)}`} style={{
              display: 'inline-block', padding: '10px 22px', borderRadius: 10,
              background: '#fff', color: '#1e3a5f', fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>{item.region} 분양 모아보기 →</a>
          </div>
        )}

        {/* 인근 실거래가 */}
        <NearbyTradeSection
          location={item.location}
          aptName={item.name}
          units={item.units ?? []}
        />

      </div>
    </div>

    {/* 라이트박스 */}

    {lightbox && (
      <div
        ref={lightboxRef}
        onClick={zoom > 1 ? undefined : closeLightbox}
        onMouseMove={e => {
          if (!dragRef.current) return;
          setOffset({ x: dragRef.current.ox + e.clientX - dragRef.current.startX, y: dragRef.current.oy + e.clientY - dragRef.current.startY });
        }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: zoom > 1 ? (dragRef.current ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
        }}
      >
        {/* 이전 */}
        {lightbox.idx > 0 && zoom === 1 && (
          <button
            onClick={e => { e.stopPropagation(); prevImage(); }}
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>
        )}

        {/* 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightbox.urls[lightbox.idx]}
          alt={`이미지 ${lightbox.idx + 1}`}
          draggable={false}
          onMouseDown={e => {
            e.stopPropagation();
            if (zoom > 1) dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => { e.stopPropagation(); if (zoom > 1) resetZoom(); else setZoom(2); }}
          style={{
            maxWidth: '90vw', maxHeight: '88vh',
            objectFit: 'contain', borderRadius: zoom > 1 ? 0 : 10,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transition: dragRef.current ? 'none' : 'transform 0.15s ease',
            cursor: zoom > 1 ? 'grab' : 'zoom-in',
          }}
        />

        {/* 다음 */}
        {lightbox.idx < lightbox.urls.length - 1 && zoom === 1 && (
          <button
            onClick={e => { e.stopPropagation(); nextImage(); }}
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        )}

        {/* 닫기 */}
        <button
          onClick={closeLightbox}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* 줌 버튼 */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); setZoom(z => Math.min(4, z + 0.5)); }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
          >+</button>
          <button
            onClick={e => { e.stopPropagation(); if (zoom > 1) { if (zoom - 0.5 <= 1) resetZoom(); else setZoom(z => z - 0.5); } }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', opacity: zoom > 1 ? 1 : 0.4 }}
          >−</button>
          {zoom > 1 && (
            <button
              onClick={e => { e.stopPropagation(); resetZoom(); }}
              style={{ height: 36, padding: '0 12px', borderRadius: 18, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}
            >1:1</button>
          )}
        </div>

        {/* 페이지 표시 */}
        {lightbox.urls.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
            fontSize: 13, color: 'rgba(255,255,255,0.7)',
          }}>
            {lightbox.idx + 1} / {lightbox.urls.length}
          </div>
        )}
      </div>
    )}
    </>
  );
}
