'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 세션스토리지에 캐시된 데이터 먼저 확인
    try {
      const cached = sessionStorage.getItem(`sale_item_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setItem(parsed);
        setLoading(false);
        // 유닛 정보가 없으면 API로 보강
        if (!parsed.units || parsed.units.length === 0) {
          fetchDetail(id, parsed);
        }
        return;
      }
    } catch { /* 무시 */ }

    fetchDetail(id, null);
  }, [id]);

  async function fetchDetail(houseManageNo: string, existing: SaleDetail | null) {
    try {
      // API route에서 상세 조회
      const res = await fetch(`/api/sale/detail?id=${houseManageNo}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      if (data.item) {
        setItem(data.item);
      } else if (existing) {
        setItem(existing);
      } else {
        setError(true);
      }
    } catch {
      if (existing) {
        setItem(existing);
      } else {
        setError(true);
      }
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
          <Link href="/sale" style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 10,
            background: '#1d4ed8', color: '#fff', textDecoration: 'none', fontWeight: 700,
          }}>← 분양정보로</Link>
        </div>
      </div>
    );
  }

  const ss = statusStyle[item.status] || statusStyle['완판'];

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: "'Apple SD Gothic Neo', sans-serif" }}>
      {/* 헤더 네비 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/sale" style={{ fontSize: 14, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>← 분양정보</Link>
          <span style={{ color: '#d1d5db' }}>|</span>
          <Link href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>계산기</Link>
        </div>
      </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['주택형', '전용면적(㎡)', '공급세대수', '분양가'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.units.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{u.type}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#374151' }}>{u.area ? u.area.toFixed(2) : '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#374151' }}>{u.count ? `${u.count.toLocaleString()}세대` : '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#374151', fontWeight: 600 }}>{u.price ? formatPrice(u.price) : '미정'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 계산기 유도 */}
        <div style={{ marginTop: 16, background: '#1e3a5f', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>💰 중도금 이자·취득세 미리 계산해보기</p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 22px', borderRadius: 10,
            background: '#fff', color: '#1e3a5f', fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>계산기 바로가기 →</Link>
        </div>
      </div>
    </div>
  );
}
