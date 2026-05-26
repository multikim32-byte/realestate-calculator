export const revalidate = 7200; // 어드민 저장 시 revalidatePath로 즉시 갱신

import GlobalNav from '@/app/components/GlobalNav';
import ShareButton from '@/app/components/ShareButton';
import { supabase } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SectionTabs from './SectionTabs';
import KakaoMap from '@/app/components/KakaoMap';
import UnsoldLeadForm from '@/app/components/UnsoldLeadForm';
import DescriptionHtml from './DescriptionHtml';

async function findListing(rawSlug: string, selectCols = '*') {
  try {
    const slug = (() => {
      try { return decodeURIComponent(rawSlug); } catch { return rawSlug; }
    })();

    const { data: bySlug } = await supabase
      .from('unsold_listings')
      .select(selectCols)
      .eq('slug', slug)
      .maybeSingle();
    if (bySlug) return { data: bySlug, redirectTo: null };

    if (slug !== rawSlug) {
      const { data: byRaw } = await supabase
        .from('unsold_listings')
        .select(selectCols)
        .eq('slug', rawSlug)
        .maybeSingle();
      if (byRaw) return { data: byRaw, redirectTo: null };
    }

    try {
      const { data: byId } = await supabase
        .from('unsold_listings')
        .select(selectCols)
        .eq('id', slug)
        .maybeSingle();
      if (byId) return { data: byId, redirectTo: null };
    } catch { /* invalid UUID format */ }

    return { data: null, redirectTo: null };
  } catch {
    return { data: null, redirectTo: null };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug: rawSlug } = await params;
    const slug = (() => { try { return decodeURIComponent(rawSlug); } catch { return rawSlug; } })();
    const { data } = await findListing(slug, 'name, location, category, benefit, min_price, max_price, thumbnail_url, slug');

    if (!data) return { title: '분양정보' };

    const item = data as unknown as Pick<UnsoldListing, 'name' | 'location' | 'category' | 'benefit' | 'min_price' | 'max_price' | 'thumbnail_url' | 'slug'>;
    const canonical = item.slug ?? slug;
    const location = item.location ?? '';
    const priceText = item.min_price
      ? `분양가 ${item.min_price >= 100000000 ? `${(item.min_price / 100000000).toFixed(1)}억` : `${Math.floor(item.min_price / 10000).toLocaleString()}만`}원~`
      : '';
    const title = `${item.name} 미분양 분양정보 — ${location} ${item.category}${priceText ? ` ${priceText}` : ''} 선착순 계약`;
    const benefitText = item.benefit ? ` 계약 혜택: ${item.benefit}.` : '';
    const description = `${item.name}(${location}) ${item.category} 미분양 분양정보입니다. ${priceText ? `${priceText}.` : ''}${benefitText} 선착순 동·호지정 계약 가능합니다.`.trim();

    const parts = location.trim().split(/\s+/);
    const sido = parts[0]?.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '') ?? '';
    const sigungu = parts[1] ?? '';
    const keywords = [
      item.name,
      `${item.name} 미분양`,
      `${sido} 미분양 아파트`,
      sigungu ? `${sigungu} 분양정보` : '',
      `${sido} ${item.category} 분양`,
      '선착순 계약',
      '미분양 분양정보',
      '잔여세대',
    ].filter(Boolean) as string[];

    return {
      title,
      description,
      keywords,
      alternates: { canonical: `https://www.aptzipsa.kr/unsold/${canonical}` },
      openGraph: {
        title,
        description,
        url: `https://www.aptzipsa.kr/unsold/${canonical}`,
        siteName: '아파트집사',
        images: item.thumbnail_url ? [{ url: item.thumbnail_url }] : [],
      },
    };
  } catch {
    return { title: '분양정보' };
  }
}

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

type UnitPriceRow = { type: string; supplyArea?: number | null; count?: number | null; min: number | null; max: number | null };

function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}


function parseUnitPrices(area: string | null): UnitPriceRow[] {
  if (!area) return [];
  try {
    const parsed = JSON.parse(area);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type) return parsed;
  } catch { /* not JSON */ }
  return [];
}

export default async function UnsoldDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = (() => { try { return decodeURIComponent(rawSlug); } catch { return rawSlug; } })();
  const { data: raw, redirectTo } = await findListing(slug);

  if (!raw) notFound();
  if (redirectTo) redirect(`/unsold/${redirectTo}`);

  const item = raw as unknown as UnsoldListing;
  if (!item.is_active) notFound();

  const mapAddress = item.location;

  const priceFrom = item.min_price ?? item.max_price;
  const priceTo = item.max_price ?? item.min_price;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.aptzipsa.kr' },
          { '@type': 'ListItem', position: 2, name: '분양정보', item: 'https://www.aptzipsa.kr/unsold' },
          { '@type': 'ListItem', position: 3, name: item.name, item: `https://www.aptzipsa.kr/unsold/${item.slug ?? slug}` },
        ],
      },
      {
        '@type': 'Residence',
        name: item.name,
        description: item.benefit ?? `${item.location} ${item.category} 분양 매물`,
        url: `https://www.aptzipsa.kr/unsold/${item.slug ?? slug}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: item.location,
          addressCountry: 'KR',
        },
        ...(item.thumbnail_url ? { image: item.thumbnail_url } : {}),
        ...(priceFrom ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'KRW',
            price: priceFrom,
            ...(priceTo && priceTo !== priceFrom ? { highPrice: priceTo, lowPrice: priceFrom, '@type': 'AggregateOffer' } : {}),
          },
        } : {}),
        ...(item.total_units ? { numberOfRooms: item.total_units } : {}),
      },
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* 뒤로가기 */}
        <Link href="/unsold" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 20 }}>
          ← 목록으로
        </Link>

        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.09)' }}>

          {/* 썸네일 */}
          <div style={{ width: '100%', height: 320, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
            {item.thumbnail_url ? (
              <Image src={item.thumbnail_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 900px" style={{ objectFit: 'cover' }} priority unoptimized />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 72 }}>🏢</div>
            )}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
              <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 16 }}>{item.category}</span>
              {item.highlight && <span style={{ background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 16 }}>⭐ 주목 단지</span>}
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={{ padding: '28px 28px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 24px' }}>{item.name}</h1>

            {/* 분양기본정보 */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>ℹ️ 분양기본정보</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ width: '30%', padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>단지명</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b', wordBreak: 'keep-all' }}>{item.name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>유형</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.category}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>위치</td>
                    <td colSpan={3} style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.location}</td>
                  </tr>
                  {item.total_units != null && (
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>세대수</td>
                      <td colSpan={3} style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {item.total_units.toLocaleString()}세대
                      </td>
                    </tr>
                  )}
                  {(() => {
                    const rows = parseUnitPrices(item.area);
                    if (rows.length > 0) return (
                      <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap', verticalAlign: 'top' }}>전용면적별 분양가</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {rows.map((r, i) => (
                              <div key={i} style={{
                                border: '1px solid #e5e7eb', borderRadius: 8,
                                overflow: 'hidden', background: '#fff',
                              }}>
                                <div style={{ background: '#eff6ff', padding: '5px 10px', fontSize: 12, fontWeight: 700, color: '#1d4ed8', borderBottom: '1px solid #dbeafe' }}>
                                  {r.type} m²
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 10px', gap: '6px 0' }}>
                                  <div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>공급면적</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.supplyArea ? `${r.supplyArea}㎡` : '-'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>공급세대</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.count ? `${r.count.toLocaleString()}세대` : '-'}</div>
                                  </div>
                                  <div style={{ gridColumn: '1 / -1', marginTop: 2, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>분양가</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                                      {r.min && r.max && r.min !== r.max
                                        ? `${fmt만원(r.min)} ~ ${fmt만원(r.max)}`
                                        : r.max ? fmt만원(r.max)
                                        : r.min ? fmt만원(r.min) : '미정'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                    // 폴백: area가 plain text이거나 없을 때
                    if (item.min_price || item.max_price) return (
                      <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>분양가</td>
                        <td colSpan={3} style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                          {item.min_price && item.max_price && item.min_price !== item.max_price
                            ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                            : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!)}
                        </td>
                      </tr>
                    );
                    return null;
                  })()}
                  {item.move_in_date && (
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>입주 예정</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.move_in_date}</td>
                    </tr>
                  )}
                  {item.contact && (
                    <tr>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>문의전화</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        <a href={`tel:${item.contact.replace(/[^0-9]/g, '')}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>{item.contact}</a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 계약 혜택 */}
            {item.benefit && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>🎁 계약 혜택</div>
                <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{item.benefit}</p>
              </div>
            )}

            {/* 상세 설명 */}
            {item.description && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>상세 설명</h2>
                <div className="unsold-content" style={{ fontSize: 14, color: '#374151', lineHeight: 1.9 }}>
                  <DescriptionHtml html={item.description} />
                </div>
                <style>{`
                  .unsold-content h2 { font-size: 18px; font-weight: 800; margin: 20px 0 10px; color: #1e293b; }
                  .unsold-content h3 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; color: #1e293b; }
                  .unsold-content p { margin: 0 0 10px; }
                  .unsold-content ul { padding-left: 20px; margin: 8px 0; }
                  .unsold-content ol { padding-left: 20px; margin: 8px 0; }
                  .unsold-content li { margin-bottom: 4px; }
                  .unsold-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
                  .unsold-content img { max-width: 100%; height: auto; border-radius: 10px; margin: 14px 0; display: block; }
                  .unsold-content strong { font-weight: 700; }
                  .unsold-content em { font-style: italic; }
                  .unsold-content u { text-decoration: underline; }
                  .unsold-content [style*="text-align: center"] { text-align: center; }
                  .unsold-content [style*="text-align: right"] { text-align: right; }
                  .unsold-content table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
                  .unsold-content td, .unsold-content th { padding: 8px 12px; border: 1px solid #e5e7eb; white-space: nowrap; min-width: 80px; }
                  .unsold-content th { background: #f8f9fa; font-weight: 700; }
                  .unsold-content * { max-width: 100%; box-sizing: border-box; }
                `}</style>
              </div>
            )}


            {/* 유튜브 영상 */}
            {extractYoutubeId(item.youtube_url) && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📹 분양 영상</h2>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(item.youtube_url)}`}
                    title="분양 영상"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* 관심 고객 등록 폼 */}
            <UnsoldLeadForm unsoldId={item.id} aptName={item.name} />

            {/* 카카오 채널 */}
            <a
              href="https://pf.kakao.com/_WYwjn"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#FEE500', borderRadius: 10, padding: '13px 20px',
                textDecoration: 'none', marginTop: 12,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="#3C1E1E">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.523 5.09 3.857 6.562L4.5 21l4.286-2.143A11.6 11.6 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3C1E1E' }}>
                카카오 채널 추가 — 새 매물·청약 소식 받기
              </span>
            </a>

            {/* 관련 도구 */}
            {(() => {
              const parts = item.location.trim().split(/\s+/);
              const sido = parts[0];
              const sigungu = parts.slice(1).join(' ');
              return (
                <div style={{ marginTop: 28, padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px', fontWeight: 600 }}>🔗 관련 정보 바로가기</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {sigungu && (
                      <Link href={`/trade?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#166534', textDecoration: 'none' }}>
                        📊 같은 지역 실거래가
                      </Link>
                    )}
                    <Link href={`/region/${encodeURIComponent(sido)}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#5b21b6', textDecoration: 'none' }}>
                      📋 지역별 청약·분양 매물 보기
                    </Link>
                    <Link href="/calculator?tab=loan"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
                      🏦 대출 계산기
                    </Link>
                    <Link href="/calculator?tab=acquisition"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#92400e', textDecoration: 'none' }}>
                      🧾 취득세 계산기
                    </Link>
                  </div>
                </div>
              );
            })()}

            {/* 단지 위치 지도 */}
            <KakaoMap address={mapAddress} name={item.name} />
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <a href="/map" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                background: '#1d4ed8', color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
              }}>
                🗺️ 분양정보 지도로 보기 →
              </a>
            </div>

            {/* 섹션별 이미지 탭 */}
            {item.sections?.length > 0 && (
              <SectionTabs sections={item.sections} />
            )}
          </div>
        </div>

        {/* SEO 키워드 태그 */}
        {(() => {
          const parts = item.location.trim().split(/\s+/);
          const sido = parts[0].replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '');
          const sigungu = parts[1] ?? '';
          const keywords = [item.name, `${sido} ${item.category} 분양`, `${sigungu} 분양정보`, '미분양 특별혜택', '잔여세대 계약'].filter(Boolean);
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>{kw}</span>
              ))}
            </div>
          );
        })()}

        {/* 공유하기 버튼 */}
        <ShareButton large />

      </div>
    </div>
  );
}
