import GlobalNav from '@/app/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import Link from 'next/link';
import Image from 'next/image';
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

export const revalidate = 86400;

export function generateStaticParams() {
  const params: { sido: string; sigungu: string }[] = [];
  for (const sido of Object.keys(REGION_LABELS)) {
    const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
    for (const d of districts) {
      params.push({ sido, sigungu: d.name });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ sido: string; sigungu: string }> }): Promise<Metadata> {
  const { sido: rawSido, sigungu: rawSigungu } = await params;
  const sido = decodeURIComponent(rawSido);
  const sigungu = decodeURIComponent(rawSigungu);
  const fullSido = REGION_LABELS[sido];
  if (!fullSido) return { title: '지역 정보' };

  const title = `${sido} ${sigungu} 아파트 실거래가 · 미분양 분양 정보 2026`;
  const description = `${sido} ${sigungu} 아파트 실거래가 조회, 미분양 매물, 전세·월세 시세를 한 페이지에서 확인하세요. 2026년 최신 ${sigungu} 부동산 정보.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.aptzipsa.kr/region/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`,
    },
    openGraph: {
      title: `${sido} ${sigungu} 아파트 정보 | 아파트집사`,
      description,
      url: `https://www.aptzipsa.kr/region/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`,
    },
  };
}

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

export default async function SigunguPage({ params }: { params: Promise<{ sido: string; sigungu: string }> }) {
  const { sido: rawSido, sigungu: rawSigungu } = await params;
  const sido = decodeURIComponent(rawSido);
  const sigungu = decodeURIComponent(rawSigungu);

  const fullSido = REGION_LABELS[sido];
  if (!fullSido) notFound();

  const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
  const district = districts.find(d => d.name === sigungu);
  if (!district) notFound();

  const lawdCd = district.code;

  // 미분양 매물 (Supabase)
  const { data: unsoldListings } = await supabase
    .from('unsold_listings')
    .select('id, slug, name, location, category, min_price, max_price, thumbnail_url, benefit, highlight')
    .eq('is_active', true)
    .or(`location.ilike.${sido} ${sigungu}%,location.ilike.${fullSido} ${sigungu}%`)
    .order('created_at', { ascending: false });

  const listings = unsoldListings ?? [];

  // 현재 년월 (실거래가 링크용)
  const now = new Date();
  const dealYmd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.aptzipsa.kr' },
          { '@type': 'ListItem', position: 2, name: sido, item: `https://www.aptzipsa.kr/region/${encodeURIComponent(sido)}` },
          { '@type': 'ListItem', position: 3, name: sigungu, item: `https://www.aptzipsa.kr/region/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}` },
        ],
      },
      {
        '@type': 'WebPage',
        name: `${sido} ${sigungu} 아파트 실거래가 · 미분양 정보`,
        description: `${sido} ${sigungu} 아파트 실거래가, 미분양 매물, 전세월세 시세 정보`,
        url: `https://www.aptzipsa.kr/region/${encodeURIComponent(sido)}/${encodeURIComponent(sigungu)}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GlobalNav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 64px' }}>
        {/* 브레드크럼 */}
        <nav style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>홈</Link>
          <span>›</span>
          <Link href={`/region/${encodeURIComponent(sido)}`} style={{ color: '#9ca3af', textDecoration: 'none' }}>{sido}</Link>
          <span>›</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>{sigungu}</span>
        </nav>

        {/* 헤더 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
            {sido} {sigungu} 아파트 부동산 정보
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>
            {sido} {sigungu} 아파트 실거래가 조회, 미분양 매물, 전세·월세 시세를 한 페이지에서 확인하세요.
          </p>
        </div>

        {/* 빠른 바로가기 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
            {sigungu} 부동산 빠른 조회
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <Link
              href={`/trade?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}&lawdCd=${lawdCd}&dealYmd=${dealYmd}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#eff6ff', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #bfdbfe', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>실거래가 조회</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{sigungu} 매매·전세·월세 실거래</div>
              </div>
            </Link>
            <Link href="/calendar" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#f0fdf4', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #bbf7d0', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#059669', marginBottom: 4 }}>청약 일정</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>2026 청약 캘린더</div>
              </div>
            </Link>
            <Link href="/calculator" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fefce8', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #fde68a', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🧮</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>대출·세금 계산</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>취득세·양도세·대출한도</div>
              </div>
            </Link>
          </div>
        </section>

        {/* 미분양 매물 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
            {sigungu} 미분양 분양 매물
            {listings.length > 0 && (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8', marginLeft: 10 }}>
                {listings.length}건
              </span>
            )}
          </h2>

          {listings.length === 0 ? (
            <div style={{
              background: '#f9fafb', borderRadius: 12, padding: 32,
              textAlign: 'center', color: '#9ca3af', fontSize: 14,
            }}>
              현재 {sigungu} 등록된 미분양 매물이 없습니다.
              <br />
              <Link href="/unsold" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
                전체 미분양 매물 보기 →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {listings.map(item => (
                <Link key={item.id} href={`/unsold/${item.slug ?? item.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: 12, overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                    border: item.highlight ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  }}>
                    <div style={{ width: '100%', height: 150, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                      {item.thumbnail_url
                        ? <Image src={item.thumbnail_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 300px" style={{ objectFit: 'cover' }} unoptimized />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>🏢</div>
                      }
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: '#d97706', color: '#fff',
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      }}>
                        미분양
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>📍 {item.location}</p>
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

        {/* SEO 텍스트 */}
        <section style={{ background: '#f8fafc', borderRadius: 16, padding: 24, marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
            {sido} {sigungu} 부동산 시장 안내
          </h2>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: '0 0 12px' }}>
            {sigungu}의 아파트 실거래가는 아파트집사 실거래가 조회 페이지에서 매매·전세·월세 모두 확인할 수 있습니다.
            국토교통부 실거래가 공개 데이터를 기반으로 최신 거래 내역을 제공합니다.
          </p>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: 0 }}>
            {fullSido} {sigungu}의 청약·분양 정보는 청약 캘린더에서 일정을 확인하고,
            대출 한도와 취득세는 부동산 계산기에서 빠르게 계산해보세요.
          </p>
        </section>

        {/* 같은 지역 다른 시/군/구 */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
            {sido} 다른 지역 보기
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {districts.filter(d => d.name !== sigungu).slice(0, 20).map(d => (
              <Link
                key={d.code}
                href={`/region/${encodeURIComponent(sido)}/${encodeURIComponent(d.name)}`}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: '#f1f5f9', color: '#475569', textDecoration: 'none',
                }}
              >
                {d.name}
              </Link>
            ))}
            <Link
              href={`/region/${encodeURIComponent(sido)}`}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: '#1d4ed8', color: '#fff', textDecoration: 'none',
              }}
            >
              {sido} 전체 보기
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
