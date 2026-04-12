import GlobalNav from '@/app/components/GlobalNav';
import { supabase } from '@/lib/supabase';
import type { UnsoldListing } from '@/lib/supabase';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SectionTabs from './SectionTabs';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from('unsold_listings')
    .select('name, location, category, benefit, min_price, max_price, thumbnail_url')
    .eq('id', params.id)
    .single();

  if (!data) return { title: '매물 정보 | mk-land.kr' };

  const priceText = data.min_price
    ? ` · ${data.min_price >= 10000 ? `${(data.min_price / 10000).toFixed(1)}억` : `${data.min_price.toLocaleString()}만`}~`
    : '';
  const title = `${data.name} 미분양 특가${priceText} | mk-land.kr`;
  const description = `${data.location} ${data.category} 미분양 특가 매물. ${data.benefit ?? '계약 혜택 확인하세요.'}`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.mk-land.kr/unsold/${params.id}` },
    openGraph: {
      title,
      description,
      url: `https://www.mk-land.kr/unsold/${params.id}`,
      images: data.thumbnail_url ? [{ url: data.thumbnail_url }] : [],
    },
  };
}

function fmt만원(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

export default async function UnsoldDetailPage({ params }: { params: { id: string } }) {
  const { data: item } = await supabase
    .from('unsold_listings')
    .select('*')
    .eq('id', params.id)
    .eq('is_active', true)
    .single() as { data: UnsoldListing | null };

  if (!item) notFound();

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9' }}>
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
              {(item.min_price || item.max_price) && (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>분양가</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>
                    {item.min_price && item.max_price
                      ? `${fmt만원(item.min_price)} ~ ${fmt만원(item.max_price)}`
                      : item.min_price ? fmt만원(item.min_price) : fmt만원(item.max_price!)}
                  </div>
                </div>
              )}
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
                  .unsold-content img { max-width: 100%; border-radius: 10px; margin: 14px 0; display: block; }
                  .unsold-content strong { font-weight: 700; }
                  .unsold-content em { font-style: italic; }
                  .unsold-content u { text-decoration: underline; }
                  .unsold-content [style*="text-align: center"] { text-align: center; }
                  .unsold-content [style*="text-align: right"] { text-align: right; }
                `}</style>
              </div>
            )}

            {/* 공식 사이트 */}
            {item.official_url && (
              <a href={item.official_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1d4ed8', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                🔗 공식 홈페이지 바로가기
              </a>
            )}

            {/* 섹션별 이미지 탭 */}
            {item.sections?.length > 0 && (
              <SectionTabs sections={item.sections} />
            )}
          </div>
        </div>

        {/* 주의사항 */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginTop: 20, fontSize: 13, color: '#92400e' }}>
          본 정보는 참고용이며 실제 분양 조건은 반드시 공식 사이트에서 확인하시기 바랍니다.
        </div>
      </div>
    </div>
  );
}
