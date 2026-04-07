'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import type { TradeItem } from '@/lib/tradeApi';

interface UnitDetail { type: string; area: number; count: number; price: number }

interface Props {
  location: string;   // 청약 단지 주소
  aptName: string;    // 청약 단지명
  units: UnitDetail[];// 주택형별 분양가
}

// ── 주소 → LAWD_CD 추출 ────────────────────────────────────────────────────

function findLawdCd(location: string): { code: string; areaName: string } | null {
  const loc = location.replace(/\s/g, '');
  const isHangul = (c: string) => c >= '가' && c <= '힣';

  // 긴 이름부터 매칭 (구체적인 이름이 먼저 → "북구"보다 "천안 서북구" 우선)
  const entries = Object.values(LAWD_CODE_MAP)
    .flat()
    .map(e => ({ ...e, bare: e.name.replace(/\s/g, '') }))
    .sort((a, b) => b.bare.length - a.bare.length);

  for (const { name, code, bare } of entries) {
    // 1차: 직접 포함 + 앞 글자가 한글이면 부분 매칭이므로 제외
    // (예: "북구"가 "서북구" 안에 매칭되는 것 방지)
    const idx = loc.indexOf(bare);
    if (idx !== -1 && !isHangul(loc[idx - 1] ?? '')) {
      return { code, areaName: name };
    }
    // 2차: "용인 처인구" → 단어별로 분리해 각각 포함 여부 확인
    // (예: "용인시처인구"에서 "용인"+"처인구" 각각 매칭)
    if (name.includes(' ')) {
      const parts = name.split(' ');
      const allMatch = parts.every((p, i) => {
        const pi = loc.indexOf(p);
        if (pi === -1) return false;
        // 마지막 파트(구 이름)는 앞 글자 경계 체크
        return i < parts.length - 1 || !isHangul(loc[pi - 1] ?? '');
      });
      if (allMatch) return { code, areaName: name };
    }
  }
  return null;
}

// ── 주소에서 동 추출 ────────────────────────────────────────────────────────

function extractDong(location: string): string {
  const parts = location.split(/\s+/);
  for (const part of parts) {
    if (/^[가-힣]+(동|읍|면|리)$/.test(part)) return part;
  }
  return '';
}

// ── 최근 3개월 YYYYMM 생성 ──────────────────────────────────────────────────

function recentYms(n = 3): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

// ── 가격 포맷 ──────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

function areaLabel(area: number) {
  return `${area.toFixed(1)}㎡(${(area / 3.305785).toFixed(0)}평)`;
}

// ── 컴포넌트 ───────────────────────────────────────────────────────────────

export default function NearbyTradeSection({ location, aptName, units }: Props) {
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaName, setAreaName] = useState('');
  const [noKey, setNoKey] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const found = findLawdCd(location);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setAreaName(found.areaName);
    loadTrades(found.code);
  }, [location]);

  async function loadTrades(lawdCd: string) {
    setLoading(true);
    try {
      const yms = recentYms(3);
      const results = await Promise.all(
        yms.map(ym =>
          fetch(`/api/trade?lawdCd=${lawdCd}&dealYmd=${ym}&numOfRows=200`)
            .then(r => r.json())
            .catch(() => ({ items: [] }))
        )
      );
      const all = results.flatMap(r => {
        if (r.source === 'no_key') setNoKey(true);
        return r.items ?? [];
      });
      // 중복 제거 (단지명+거래일+면적)
      const seen = new Set<string>();
      const deduped = all.filter(t => {
        const key = `${t.name}|${t.dealDate}|${t.area}|${t.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTrades(deduped.sort((a, b) => b.dealDate.localeCompare(a.dealDate)));
    } finally {
      setLoading(false);
    }
  }

  // API 키 없음 또는 주소 매칭 실패
  if (noKey || notFound) return null;

  // 동일 단지명 거래
  const sameApt = trades.filter(t => t.name === aptName);

  // 주소에서 동 추출
  const dong = extractDong(location);

  // 인근 거래 (동일 단지 제외, 같은 동 우선, 최대 10건)
  const nearby = trades
    .filter(t => t.name !== aptName && (dong ? t.dong === dong : true))
    .slice(0, 10);

  // 분양가 vs 실거래가 비교: units의 면적과 ±10㎡ 범위에서 매칭
  const comparisons = units
    .filter(u => u.price > 0 && u.area > 0)
    .map(u => {
      const matched = sameApt.filter(t => Math.abs(t.area - u.area) <= 10);
      if (matched.length === 0) return null;
      const avg = Math.round(matched.reduce((s, t) => s + t.price, 0) / matched.length);
      const diff = avg - u.price;
      return { type: u.type, area: u.area, supplyPrice: u.price, tradeAvg: avg, diff, count: matched.length };
    })
    .filter(Boolean) as { type: string; area: number; supplyPrice: number; tradeAvg: number; diff: number; count: number }[];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
          📊 인근 실거래가
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{areaName} · 최근 3개월</span>
          <Link
            href="/trade"
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', color: '#1d4ed8', textDecoration: 'none' }}
          >
            실거래가 상세 →
          </Link>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
          실거래가 데이터를 불러오는 중...
        </div>
      )}

      {!loading && (
        <>
          {/* ── 분양가 vs 실거래가 비교 ── */}
          {comparisons.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>
                동일 단지 분양가 vs 실거래가 비교
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {comparisons.map((c, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr 1fr',
                    gap: '0 12px',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#f0f9ff',
                    borderRadius: 10,
                    border: '1px solid #bae6fd',
                    fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{c.type}</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>분양가</div>
                      <div style={{ fontWeight: 600 }}>{fmt(c.supplyPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>실거래 평균 ({c.count}건)</div>
                      <div style={{ fontWeight: 600 }}>{fmt(c.tradeAvg)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>차이</div>
                      <div style={{
                        fontWeight: 700,
                        color: c.diff > 0 ? '#16a34a' : c.diff < 0 ? '#dc2626' : '#374151',
                      }}>
                        {c.diff > 0 ? '+' : ''}{fmt(c.diff)}
                        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                          {c.diff > 0 ? '(실거래↑)' : c.diff < 0 ? '(실거래↓)' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 동일 단지 거래 내역 ── */}
          {sameApt.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>
                {aptName} 실거래 내역 ({sameApt.length}건)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f9ff' }}>
                      {['거래일', '전용면적', '층', '거래금액', '거래유형'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap', borderBottom: '1px solid #bae6fd' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sameApt.slice(0, 20).map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8faff' }}>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                        <td style={{ padding: '7px 10px' }}>{t.floor}층</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{fmt(t.price)}</td>
                        <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.dealType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 인근 거래 ── */}
          {nearby.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 }}>
                {dong || areaName} 인근 최근 거래
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['단지명', '동', '전용면적', '층', '거래금액', '거래일'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nearby.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 500 }}>{t.name}</td>
                        <td style={{ padding: '7px 10px', color: '#6b7280' }}>{t.dong}</td>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{areaLabel(t.area)}</td>
                        <td style={{ padding: '7px 10px' }}>{t.floor}층</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{fmt(t.price)}</td>
                        <td style={{ padding: '7px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{t.dealDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 데이터 없음 */}
          {sameApt.length === 0 && nearby.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
              <p>최근 3개월 인근 실거래 데이터가 없습니다.</p>
              <Link href="/trade" style={{ fontSize: 13, color: '#1d4ed8' }}>실거래가 조회 페이지에서 직접 확인하기 →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
