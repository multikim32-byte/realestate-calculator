import GlobalNav from '@/app/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SectionTabs from './SectionTabs';
import UnitTable from './UnitTable';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data, error } = await supabase
    .from('unsold_listings')
    .select('name, location, category, benefit, min_price, max_price, thumbnail_url')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return { title: '분양정보 | mk-land.kr' };

  const priceText = data.min_price
    ? `분양가 ${data.min_price >= 100000000 ? `${(data.min_price / 100000000).toFixed(1)}억` : `${Math.floor(data.min_price / 10000).toLocaleString()}만`}원~`
    : '';
  const title = `${data.name} 분양정보 — ${data.location} ${data.category} ${priceText ? `${priceText} ` : ''}잔여세대 확인 | mk-land.kr`;
  const benefitText = data.benefit ? ` 계약 혜택: ${data.benefit}.` : '';
  const description = `${data.name}(${data.location}) ${data.category} 분양정보입니다. ${priceText ? `${priceText}.` : ''} ${benefitText} 잔여 세대 및 청약 조건을 확인하세요.`.trim();

  return {
    title,
    description,
    alternates: { canonical: `https://www.mk-land.kr/unsold/${id}` },
    openGraph: {
      title,
      description,
      url: `https://www.mk-land.kr/unsold/${id}`,
      images: data.thumbnail_url ? [{ url: data.thumbnail_url }] : [],
    },
  };
}

function fmt만원(v: number) {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}만`;
  return `${v.toLocaleString()}원`;
}

export default async function UnsoldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: item } = await supabase
    .from('unsold_listings')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle() as { data: UnsoldListing | null };

  if (!item) notFound();

  const priceFrom = item.min_price ?? item.max_price;
  const priceTo = item.max_price ?? item.min_price;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.mk-land.kr' },
          { '@type': 'ListItem', position: 2, name: '분양정보', item: 'https://www.mk-land.kr/unsold' },
          { '@type': 'ListItem', position: 3, name: item.name, item: `https://www.mk-land.kr/unsold/${id}` },
        ],
      },
      {
        '@type': 'Residence',
        name: item.name,
        description: item.benefit ?? `${item.location} ${item.category} 분양 매물`,
        url: `https://www.mk-land.kr/unsold/${id}`,
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
              <img src={item.thumbnail_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 72 }}>🏢</div>
            )}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
              <span style={{
                background: item.listing_type === '청약중' ? '#059669' : '#d97706',
                color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 16,
              }}>
                {item.listing_type === '청약중' ? '🟢 청약중' : '🟡 잔여세대'}
              </span>
              <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 16 }}>{item.category}</span>
              {item.highlight && <span style={{ background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 16 }}>⭐ 주목 단지</span>}
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={{ padding: '28px 28px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>{item.name}</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>📍 {item.location}</p>

            {/* 핵심 정보 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>분양가</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>
                  {item.min_price || item.max_price
                    ? (item.min_price && item.max_price
                        ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                        : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!))
                    : '분양가 문의'}
                </div>
              </div>
              {item.total_units != null && (
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>총 세대수</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>{item.total_units.toLocaleString()}세대</div>
                </div>
              )}
              {item.remaining_units != null && (
                <div style={{ background: '#fffbeb', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>잔여 세대</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#92400e' }}>{item.remaining_units.toLocaleString()}세대</div>
                </div>
              )}
              {item.area && (
                <div style={{ background: '#fdf4ff', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>전용면적</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>{item.area}</div>
                </div>
              )}
            </div>

            {/* 청약 일정 + 문의 */}
            {(item.receipt_start || item.move_in_date || item.contact) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, marginBottom: 20, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                {[
                  item.receipt_start && { label: '청약접수', value: item.receipt_end ? `${item.receipt_start} ~ ${item.receipt_end}` : item.receipt_start },
                  item.move_in_date && { label: '입주 예정', value: item.move_in_date },
                  item.contact && { label: '문의전화', value: item.contact },
                ].filter(Boolean).map((row: any, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

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

            {/* 주택형별 공급정보 (청약 API 연동) */}
            {item.house_manage_no && <UnitTable houseManageNo={item.house_manage_no} />}

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

            {/* 섹션별 이미지 탭 */}
            {item.sections?.length > 0 && (
              <SectionTabs sections={item.sections} />
            )}
          </div>
        </div>

        {/* SEO 콘텐츠 섹션 */}
        {(() => {
          const parts = item.location.trim().split(/\s+/);
          const sido = parts[0];
          const sigungu = parts[1] ?? '';
          return (
            <div style={{ background: '#fff', borderRadius: 12, padding: '24px', marginTop: 20, border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', margin: '0 0 12px' }}>
                {item.name} 분양정보 안내
              </h2>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: '0 0 12px' }}>
                {item.name}은(는) {item.location}에 위치한 {item.category}
                {item.total_units ? ` 총 ${item.total_units.toLocaleString()}세대` : ''} 규모의 분양 단지입니다.
                {item.area ? ` 전용면적 ${item.area} 구성으로 공급됩니다.` : ''}
                {item.listing_type === '청약중' ? ' 현재 청약 접수 중이며,' : ' 잔여 세대 계약이 가능하며,'}
                {item.benefit ? ` ${item.benefit} 등 특별 혜택을 제공합니다.` : ' 상세 계약 조건은 문의하시기 바랍니다.'}
              </p>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: '0 0 12px' }}>
                {sigungu ? `${sido} ${sigungu} 지역` : `${sido} 지역`}의 아파트 실거래가와 함께 비교하여 적정 분양가를 판단해 보세요.
                취득세·대출 한도 등 부동산 관련 비용은 mk-land.kr 무료 계산기를 이용하실 수 있습니다.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {[item.name, `${sido} ${item.category} 분양`, `${sigungu} 분양정보`, '미분양 특별혜택', '잔여세대 계약'].filter(Boolean).map((kw, i) => (
                  <span key={i} style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>{kw}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 주의사항 */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginTop: 16, fontSize: 13, color: '#92400e' }}>
          본 정보는 참고용이며 실제 분양 조건은 반드시 공식 사이트에서 확인하시기 바랍니다.
        </div>

        {/* 공식 사이트 */}
        {item.official_url && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href={item.official_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1d4ed8', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              🔗 공식 홈페이지 바로가기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
