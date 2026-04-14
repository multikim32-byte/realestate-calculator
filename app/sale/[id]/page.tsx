'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import GlobalNav from '../../components/GlobalNav';
import KakaoMap from '../../components/KakaoMap';
import NearbyTradeSection from '../../components/NearbyTradeSection';
import CompetitionRateSection from '../../components/CompetitionRateSection';

type UnitDetail = { type: string; area: number; count: number; price: number };

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
  constructionCompany?: string;
  contact?: string;
  units: UnitDetail[];
  pblancUrl?: string;
  houseManageNo?: string;
  pblancNo?: string;
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  '청약예정':   { bg: '#dbeafe', color: '#1d4ed8' },
  '청약중':     { bg: '#d1fae5', color: '#065f46' },
  '당첨발표':   { bg: '#fef3c7', color: '#92400e' },
  '선착순분양': { bg: '#fce7f3', color: '#9d174d' },
  '완판':       { bg: '#f3f4f6', color: '#6b7280' },
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

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unsoldLink, setUnsoldLink] = useState<UnsoldLink | null>(null);

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

  const ss = statusStyle[item.status] || statusStyle['완판'];

  return (
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
          <div style={{ marginTop: 16 }}>
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
              {item.floors ? <Row label="최고층수" value={`${item.floors}층`} /> : null}
              {item.constructionCompany ? <Row label="건설사" value={item.constructionCompany} /> : null}
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
                  {/* 3개 정보 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {[
                      { label: '전용면적(㎡)', value: u.area ? u.area.toFixed(2) : '-' },
                      { label: '공급세대수', value: u.count ? `${u.count.toLocaleString()}세대` : '-' },
                      { label: '분양가', value: u.price ? formatPrice(u.price) : '미정' },
                    ].map(({ label, value }, j) => (
                      <div key={label} style={{
                        padding: '10px 8px', textAlign: 'center',
                        borderRight: j < 2 ? '1px solid #e5e7eb' : 'none',
                      }}>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', wordBreak: 'keep-all' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                <img src={unsoldLink.thumbnail_url} alt={unsoldLink.name}
                  style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
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

        {/* 경쟁률 */}
        {item.houseManageNo && item.pblancNo && (
          <CompetitionRateSection
            houseManageNo={item.houseManageNo}
            pblancNo={item.pblancNo}
            status={item.status}
          />
        )}

        {/* 카카오 지도 */}
        {item.location && <KakaoMap address={item.location} name={item.name} />}

        {/* 인근 실거래가 */}
        <NearbyTradeSection
          location={item.location}
          aptName={item.name}
          units={item.units ?? []}
        />

        {/* 계산기 유도 */}
        <div style={{ marginTop: 16, background: '#1e3a5f', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>💰 중도금 이자·취득세 미리 계산해보기</p>
          <Link href="/calculator" style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 10,
            background: '#fff', color: '#1e3a5f', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>계산기 바로가기 →</Link>
        </div>
      </div>
    </div>
  );
}
