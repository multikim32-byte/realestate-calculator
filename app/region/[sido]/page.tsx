import GlobalNav from '@/app/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const REGION_LABELS: Record<string, string> = {
  '서울': '서울특별시', '경기': '경기도', '인천': '인천광역시',
  '부산': '부산광역시', '대구': '대구광역시', '광주': '광주광역시',
  '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시',
  '강원': '강원도', '충북': '충청북도', '충남': '충청남도',
  '전북': '전라북도', '전남': '전라남도', '경북': '경상북도',
  '경남': '경상남도', '제주': '제주특별자치도',
};

export const revalidate = 3600; // 1시간 캐시 후 재검증

export async function generateMetadata({ params }: { params: Promise<{ sido: string }> }): Promise<Metadata> {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const fullName = REGION_LABELS[sido];
  if (!fullName) return { title: '지역 정보 | mk-land.kr' };
  return {
    title: `${sido} 청약·분양 모아보기 — ${fullName} 아파트 청약정보 & 분양 매물 | mk-land.kr`,
    description: `${fullName} 아파트 청약 일정, 미분양 분양 매물, 실거래가를 한 페이지에서 확인하세요. 2026년 최신 ${sido} 청약·분양 정보.`,
    alternates: { canonical: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}` },
    openGraph: {
      title: `${sido} 청약·분양 모아보기 | mk-land.kr`,
      description: `${fullName} 아파트 청약정보 & 분양 매물 한눈에`,
      url: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}`,
    },
  };
}

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

export default async function RegionPage({ params }: { params: Promise<{ sido: string }> }) {
  const { sido: rawSido } = await params;
  const sido = decodeURIComponent(rawSido);
  const fullName = REGION_LABELS[sido];
  if (!fullName) notFound();

  // 분양정보 (Supabase)
  const { data: unsoldListings } = await supabase
    .from('unsold_listings')
    .select('id, name, location, category, listing_type, min_price, max_price, thumbnail_url, benefit, highlight')
    .eq('is_active', true)
    .ilike('location', `${sido} %`)
    .order('created_at', { ascending: false });

  // 청약정보는 실시간 API라 별도 링크로 안내

  // 실거래가 링크: 시도별 대표 시군구 + 동 선택
  const DEFAULT_SIGUNGU_DONG: Record<string, { sigungu: string; dong: string }> = {
    '서울': { sigungu: '마포구', dong: '아현동' },
    '경기': { sigungu: '수원시 영통구', dong: '영통동' },
    '인천': { sigungu: '부평구', dong: '부평동' },
    '부산': { sigungu: '해운대구', dong: '우동' },
    '대구': { sigungu: '수성구', dong: '범어동' },
    '광주': { sigungu: '서구', dong: '치평동' },
    '대전': { sigungu: '서구', dong: '둔산동' },
    '울산': { sigungu: '남구', dong: '삼산동' },
    '세종': { sigungu: '세종시', dong: '어진동' },
    '강원': { sigungu: '춘천시', dong: '퇴계동' },
    '충북': { sigungu: '청주시 흥덕구', dong: '가경동' },
    '충남': { sigungu: '천안시 서북구', dong: '불당동' },
    '전북': { sigungu: '전주시 완산구', dong: '효자동' },
    '전남': { sigungu: '여수시', dong: '학동' },
    '경북': { sigungu: '포항시 남구', dong: '대잠동' },
    '경남': { sigungu: '창원시 성산구', dong: '사파동' },
    '제주': { sigungu: '제주시', dong: '노형동' },
  };
  const defaultArea = DEFAULT_SIGUNGU_DONG[sido];
  const firstDistrict = defaultArea
    ? (LAWD_CODE_MAP as any)[sido]?.find((d: any) => d.name === defaultArea.sigungu)
      ?? (LAWD_CODE_MAP as any)[sido]?.[0]
    : (LAWD_CODE_MAP as any)[sido]?.[0];
  const tradeUrl = firstDistrict
    ? `/trade?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(firstDistrict.name)}${defaultArea ? `&dong=${encodeURIComponent(defaultArea.dong)}` : ''}`
    : '/trade';

  const allRegions = Object.keys(REGION_LABELS);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.mk-land.kr' },
          { '@type': 'ListItem', position: 2, name: `${sido} 청약·분양 모아보기`, item: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${sido} 청약·분양 모아보기`,
        description: `${fullName} 아파트 청약 일정, 미분양 분양 매물, 실거래가를 한 페이지에서 확인하세요.`,
        url: `https://www.mk-land.kr/region/${encodeURIComponent(sido)}`,
        isPartOf: { '@type': 'WebSite', url: 'https://www.mk-land.kr', name: 'mk-land.kr' },
      },
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '36px 16px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 6px' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>홈</Link>
          {' › '}{sido}
        </p>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
          {sido} 청약 · 분양 모아보기
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
          {fullName} 청약 일정, 분양 매물, 실거래가를 한 페이지에서 확인하세요
        </p>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* 빠른 이동 버튼 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <Link href={`/region/${sido}#unsold`}
            style={{ padding: '8px 16px', background: '#059669', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            🏷️ 분양정보 {unsoldListings?.length ? `(${unsoldListings.length})` : ''}
          </Link>
          <Link href={`/?region=${encodeURIComponent(sido)}`}
            style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            📋 청약정보 보기
          </Link>
          <Link href={tradeUrl}
            style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            📊 실거래가 조회 →
          </Link>
        </div>

        {/* ── 분양정보 ── */}
        <section id="unsold" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>🏷️ {sido} 분양 매물</h2>
            <Link href="/unsold" style={{ fontSize: 13, color: '#059669', textDecoration: 'none' }}>전체보기 →</Link>
          </div>

          {!unsoldListings || unsoldListings.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
              현재 등록된 {sido} 분양 매물이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {unsoldListings.map(item => (
                <Link key={item.id} href={`/unsold/${item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: 12, overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    border: item.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                    transition: 'box-shadow 0.15s',
                  }}>
                    <div style={{ width: '100%', height: 160, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                      {item.thumbnail_url
                        ? <img src={item.thumbnail_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>🏢</div>
                      }
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: item.listing_type === '청약중' ? '#059669' : '#d97706',
                        color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      }}>
                        {item.listing_type === '청약중' ? '🟢 청약중' : '🟡 잔여세대'}
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>📍 {item.location}</p>
                      {(item.min_price || item.max_price) && (
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', margin: 0 }}>
                          {item.min_price && item.max_price
                            ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                            : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!)}
                        </p>
                      )}
                      {item.benefit && <p style={{ fontSize: 12, color: '#059669', margin: '6px 0 0', fontWeight: 600 }}>🎁 {item.benefit}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 청약정보 ── */}
        <section id="sale" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>📋 {sido} 청약정보</h2>
            <Link href="/" style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none' }}>전체보기 →</Link>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>📋 {sido} 청약 일정을 확인하세요</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>청약홈 실시간 데이터 기반 · 접수중·예정 단지 모두 포함</p>
            </div>
            <Link href={`/?region=${encodeURIComponent(sido)}`}
              style={{ padding: '12px 24px', background: '#1d4ed8', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
              {sido} 청약정보 보기 →
            </Link>
          </div>
        </section>

        {/* ── 실거래가 바로가기 ── */}
        <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 4px' }}>📊 {sido} 아파트 실거래가</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>국토교통부 실거래가 데이터 · 지역별 최신 거래 현황</p>
          </div>
          <Link href={tradeUrl}
            style={{ padding: '12px 24px', background: '#fff', color: '#1e293b', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            실거래가 조회하기 →
          </Link>
        </div>

        {/* ── 다른 지역 ── */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>다른 지역 보기</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allRegions.filter(r => r !== sido).map(r => (
              <Link key={r} href={`/region/${r}`}
                style={{ padding: '6px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, textDecoration: 'none', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                {r}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
