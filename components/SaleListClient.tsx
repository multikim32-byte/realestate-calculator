'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SaleItem } from '@/lib/types';

const statusColors: Record<string, { bg: string; color: string }> = {
  '청약예정': { bg: '#e8f0fe', color: '#1a56db' },
  '청약중':   { bg: '#d1fae5', color: '#065f46' },
  '당첨발표': { bg: '#fef3c7', color: '#92400e' },
  '선착순분양': { bg: '#fce7f3', color: '#9d174d' },
  '완판':     { bg: '#f3f4f6', color: '#6b7280' },
};

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산'];
const STATUSES = ['전체', '청약예정', '청약중', '당첨발표', '선착순분양'];

type Props = {
  initialItems: SaleItem[];
  initialTotal: number;
  dataSource: string;
};

export default function SaleListClient({ initialItems, initialTotal, dataSource }: Props) {
  const [region, setRegion] = useState('전체');
  const [status, setStatus] = useState('전체');

  const filtered = initialItems.filter((item) => {
    const regionOk = region === '전체' || item.region === region;
    const statusOk = status === '전체' || item.status === status;
    return regionOk && statusOk;
  });

  return (
    <div>
      {/* 필터 */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: '1px solid',
              borderColor: region === r ? '#2563eb' : '#e5e7eb',
              background: region === r ? '#2563eb' : '#fff',
              color: region === r ? '#fff' : '#374151',
              cursor: 'pointer',
            }}
          >{r}</button>
        ))}
      </div>
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: '1px solid',
              borderColor: status === s ? '#1e3a5f' : '#e5e7eb',
              background: status === s ? '#1e3a5f' : '#fff',
              color: status === s ? '#fff' : '#374151',
              cursor: 'pointer',
            }}
          >{s}</button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        {filtered.length}개 단지
        {dataSource === 'mock' && ' (샘플 데이터)'}
      </p>

      {/* 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map((item) => {
          const st = statusColors[item.status] || { bg: '#f3f4f6', color: '#6b7280' };
          return (
            <Link key={item.id} href={`/sale/${item.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff',
                borderRadius: 14,
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: st.bg, color: st.color,
                    }}>{item.status}</span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{item.buildingType}</span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{item.supplyType}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{item.region} {item.district}</span>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#1e3a5f' }}>{item.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{item.location}</p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#555' }}>
                  <span>총 <strong>{item.totalUnits.toLocaleString()}</strong>세대</span>
                  <span>분양가 <strong>{(item.minPrice / 10000).toFixed(0)}억~{(item.maxPrice / 10000).toFixed(0)}억</strong></span>
                  <span>{item.floors}층</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#888', borderTop: '1px solid #f0f4f9', paddingTop: 10 }}>
                  <span>공고 {item.announcementDate}</span>
                  <span>접수 {item.receiptStart} ~ {item.receiptEnd}</span>
                  <span>당첨발표 {item.winnerDate}</span>
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontSize: 14 }}>
            해당 조건의 분양 정보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
