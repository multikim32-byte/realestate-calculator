import type { UnsoldApt } from '../../data/unsoldApts';
import Link from 'next/link';

const fmt = (n: number) => (n / 10000).toFixed(0) + '억';

export default function UnsoldAptCard({ apt }: { apt: UnsoldApt }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: apt.highlight ? '2px solid #2563eb' : '1px solid #e5e7eb',
      overflow: 'hidden',
      boxShadow: apt.highlight ? '0 4px 20px rgba(37,99,235,0.10)' : '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      {/* 태그 */}
      <div style={{ background: '#dc2626', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>🏷️ {apt.tag}</span>
        {apt.highlight && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>⭐ 주목 단지</span>
        )}
      </div>

      <div style={{ padding: '20px 20px 16px' }}>
        {/* 단지명 */}
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#1e3a5f' }}>{apt.name}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>📍 {apt.location}</p>

        {/* 2열 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
          {[
            ['잔여 세대', `${apt.remainingUnits.toLocaleString()}세대 / 총 ${apt.totalUnits.toLocaleString()}세대`],
            ['분양가', `${fmt(apt.minPrice * 10000)} ~ ${fmt(apt.maxPrice * 10000)}`],
            ['면적', apt.area],
            ['잔여율', `${Math.round((apt.remainingUnits / apt.totalUnits) * 100)}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 혜택 */}
        <div style={{
          background: '#eff6ff', borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#1d4ed8', fontWeight: 600, marginBottom: 16,
        }}>
          💡 {apt.benefit}
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={apt.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, textAlign: 'center', padding: '9px 0',
              background: '#1e3a5f', color: '#fff', borderRadius: 8,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            공식 분양 페이지 →
          </a>
          <Link
            href="/#취득세"
            style={{
              flex: 1, textAlign: 'center', padding: '9px 0',
              background: '#f0f4ff', color: '#2563eb', borderRadius: 8,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              border: '1px solid #dbeafe',
            }}
          >
            취득세 계산하기
          </Link>
        </div>
      </div>
    </div>
  );
}
