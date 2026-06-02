import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GlobalNav from '@/app/components/GlobalNav';
import ComplexClient from './ComplexClient';

export const revalidate = 86400;
export const dynamicParams = true;

type Complex = {
  kapt_code: string;
  name: string;
  slug: string;
  sido: string;
  sigungu: string;
  dong: string | null;
  lat: number | null;
  lng: number | null;
  total_units: number | null;
  built_year: number | null;
  floor_count: number | null;
  nearby_transit: NearbyItem[] | null;
  nearby_schools: SchoolItem[] | null;
  nearby_infra: NearbyItem[] | null;
};

type NearbyItem = { name: string; distance: number; address?: string; category?: string; label?: string };
type SchoolItem = NearbyItem & { school_type: string };

function supabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getComplex(slug: string): Promise<Complex | null> {
  try {
    const { data } = await supabaseClient()
      .from('apartment_complexes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    return data ?? null;
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    // 인기 단지 상위 500개만 정적 생성 (나머지는 on-demand ISR)
    const { data } = await supabaseClient()
      .from('apartment_complexes')
      .select('slug')
      .not('lat', 'is', null)
      .limit(500);
    return (data ?? []).map(r => ({ slug: r.slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const complex = await getComplex(decodeURIComponent(slug));
  if (!complex) return { title: '단지 정보 | 아파트집사' };

  const title = `${complex.name} 실거래가 시세 — ${complex.sido} ${complex.sigungu}`;
  const description = `${complex.name}(${complex.sido} ${complex.sigungu}${complex.dong ? ' ' + complex.dong : ''}) 아파트 실거래가 시세 조회. ${complex.total_units ? complex.total_units.toLocaleString() + '세대' : ''}${complex.built_year ? ' ' + complex.built_year + '년 준공' : ''}. 평형별 가격 추이, 교통, 학군 정보.`;
  const url = `https://www.danjizipsa.kr/complex/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ko_KR',
      siteName: '아파트집사',
      images: [{ url: 'https://www.danjizipsa.kr/opengraph-image', width: 1200, height: 630 }],
    },
    keywords: [
      complex.name,
      `${complex.name} 실거래가`,
      `${complex.name} 시세`,
      `${complex.sigungu} 아파트 시세`,
      `${complex.sido} 아파트 실거래가`,
    ],
  };
}

export default async function ComplexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const complex = await getComplex(decodeURIComponent(slug));
  if (!complex) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: complex.name,
    description: `${complex.sido} ${complex.sigungu} 아파트`,
    address: {
      '@type': 'PostalAddress',
      addressRegion: complex.sido,
      addressLocality: complex.sigungu,
      streetAddress: complex.dong ?? '',
      addressCountry: 'KR',
    },
    ...(complex.lat && complex.lng ? {
      geo: { '@type': 'GeoCoordinates', latitude: complex.lat, longitude: complex.lng },
    } : {}),
  };

  return (
    <div style={{ background: '#f0f4f9', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobalNav />
      <ComplexClient complex={complex} />
    </div>
  );
}
