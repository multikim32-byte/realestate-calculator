export const revalidate = 3600; // 1시간 캐시, 어드민 저장 시 revalidatePath로 즉시 갱신

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
import { fetchSaleDetail } from '@/lib/publicDataApi';

async function findListing(slug: string, selectCols = '*') {
  // slug로 먼저 조회
  const { data: bySlug } = await supabase
    .from('unsold_listings')
    .select(selectCols)
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return { data: bySlug, redirectTo: null };

  // 구 UUID URL 하위 호환: id로 조회 후 slug로 리다이렉트
  try {
    const { data: byId } = await supabase
      .from('unsold_listings')
      .select(selectCols)
      .eq('id', slug)
      .maybeSingle();
    if (byId) return { data: byId, redirectTo: (byId as unknown as UnsoldListing).slug ?? null };
  } catch { /* invalid UUID format */ }

  return { data: null, redirectTo: null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await findListing(slug, 'name, location, category, benefit, min_price, max_price, thumbnail_url, slug');

  if (!data) return { title: '분양정보' };

  const item = data as Pick<UnsoldListing, 'name' | 'location' | 'category' | 'benefit' | 'min_price' | 'max_price' | 'thumbnail_url' | 'slug'>;
  const canonical = item.slug ?? slug;
  const priceText = item.min_price
    ? `분양가 ${item.min_price >= 100000000 ? `${(item.min_price / 100000000).toFixed(1)}억` : `${Math.floor(item.min_price / 10000).toLocaleString()}만`}원~`
    : '';
  const title = `${item.name} 미분양 분양정보 — ${item.location} ${item.category}${priceText ? ` ${priceText}` : ''} 선착순 계약`;
  const benefitText = item.benefit ? ` 계약 혜택: ${item.benefit}.` : '';
  const description = `${item.name}(${item.location}) ${item.category} 미분양 분양정보입니다. ${priceText ? `${priceText}.` : ''}${benefitText} 선착순 동·호지정 계약 가능합니다.`.trim();

  return {
    title,
    description,
    alternates: { canonical: `https://www.aptzipsa.kr/unsold/${canonical}` },
    openGraph: {
      title,
      description,
      url: `https://www.aptzipsa.kr/unsold/${canonical}`,
      images: item.thumbnail_url ? [{ url: item.thumbnail_url }] : [],
    },
  };
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
  const { slug } = await params;
  const { data: raw, redirectTo } = await findListing(slug);

  if (!raw) notFound();
  if (redirectTo) redirect(`/unsold/${redirectTo}`);

  const item = raw as UnsoldListing;
  if (!item.is_active) notFound();

  // house_manage_no가 있으면 청약홈 API에서 상세 주소 가져옴 → KakaoMap 정확도 향상
  let mapAddress = item.location;
  if (item.house_manage_no) {
    try {
      const saleItem = await fetchSaleDetail(item.house_manage_no);
      if (saleItem?.location) mapAddress = saleItem.location;
    } catch { /* 실패 시 item.location 그대로 사용 */ }
  }

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
              <Image src={item.thumbnail_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 900px" style={{ objectFit: 'cover' }} priority />
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
                    <td style={{ width: '22%', padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>단지명</td>
                    <td style={{ width: '28%', padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.name}</td>
                    <td style={{ width: '22%', padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>유형</td>
                    <td style={{ width: '28%', padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.category}</td>
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
                        <td colSpan={3} style={{ padding: '8px 16px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '4px 12px 4px 0', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>타입</th>
                                <th style={{ textAlign: 'left', padding: '4px 12px 4px 0', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>공급면적</th>
                                <th style={{ textAlign: 'left', padding: '4px 12px 4px 0', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>공급세대</th>
                                <th style={{ textAlign: 'left', padding: '4px 0', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>분양가</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '7px 12px 7px 0', fontWeight: 700, color: '#1e293b' }}>{r.type} m²</td>
                                  <td style={{ padding: '7px 12px 7px 0', color: '#374151' }}>{r.supplyArea ? `${r.supplyArea}m²` : '-'}</td>
                                  <td style={{ padding: '7px 12px 7px 0', color: '#374151' }}>{r.count ? `${r.count.toLocaleString()}세대` : '-'}</td>
                                  <td style={{ padding: '7px 0', fontWeight: 700, color: '#1d4ed8' }}>
                                    {r.min && r.max && r.min !== r.max
                                      ? `${fmt만원(r.min)} ~ ${fmt만원(r.max)}`
                                      : r.max ? fmt만원(r.max)
                                      : r.min ? fmt만원(r.min) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
                  {(item.move_in_date || item.contact) && (
                    <tr>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>입주 예정</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.move_in_date || '-'}</td>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b7280', fontWeight: 600, background: '#fafafa', whiteSpace: 'nowrap' }}>문의전화</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        {item.contact
                          ? <a href={`tel:${item.contact.replace(/[^0-9]/g, '')}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>{item.contact}</a>
                          : '-'}
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
                <div
                  className="unsold-content"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                  style={{ fontSize: 14, color: '#374151', lineHeight: 1.9 }}
                />
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
