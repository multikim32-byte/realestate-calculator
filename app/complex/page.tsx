import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import GlobalNav from '@/app/components/GlobalNav';
import ComplexLandingClient from './ComplexLandingClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '아파트 단지 실거래가 시세 조회 | 아파트집사',
  description: '전국 21,000개 아파트 단지 실거래가 시세를 조회하세요. 평형별 가격 추이, 교통, 학군, 주변 인프라 정보를 한눈에.',
  alternates: { canonical: 'https://www.danjizipsa.kr/complex' },
  openGraph: {
    title: '아파트 단지 실거래가 시세 조회 | 아파트집사',
    description: '전국 21,000개 아파트 단지 실거래가 시세. 평형별 가격 추이, 교통, 학군 정보.',
    url: 'https://www.danjizipsa.kr/complex',
    type: 'website',
    siteName: '아파트집사',
  },
};

async function getPopularComplexes() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    // 서울 주요 단지 (강남/서초/송파/마포/용산 중심)
    const { data } = await db
      .from('apartment_complexes')
      .select('slug, name, sido, sigungu, dong, total_units, built_year')
      .in('sigungu', ['강남구', '서초구', '송파구', '마포구', '용산구', '분당구', '수지구'])
      .not('lat', 'is', null)
      .order('name')
      .limit(24);
    return data ?? [];
  } catch { return []; }
}

export default async function ComplexPage() {
  const popular = await getPopularComplexes();

  return (
    <div style={{ background: '#f0f4f9', minHeight: '100vh' }}>
      <GlobalNav />
      <ComplexLandingClient popularComplexes={popular} />
    </div>
  );
}
