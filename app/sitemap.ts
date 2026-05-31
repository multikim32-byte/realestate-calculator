export const revalidate = 86400; // 24시간

import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { fetchPublicSaleList } from '@/lib/publicDataApi';
import { LAWD_CODE_MAP } from '@/lib/tradeApi';
import { aptPosts } from '@/app/apt/data';

const serviceDb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BASE = 'https://www.danjizipsa.kr';

const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

const STATIC_PAGES = [
  { url: `${BASE}`,              priority: 1.0, changeFrequency: 'daily'   as const },
  { url: `${BASE}/calendar`,     priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/trade`,        priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/map`,          priority: 0.8, changeFrequency: 'daily'   as const },
  { url: `${BASE}/unsold`,       priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/rental`,       priority: 0.8, changeFrequency: 'daily'   as const },
  { url: `${BASE}/calculator`,   priority: 0.8, changeFrequency: 'weekly'  as const },
  { url: `${BASE}/apt`,          priority: 0.8, changeFrequency: 'weekly'  as const },
  { url: `${BASE}/about`,        priority: 0.5, changeFrequency: 'monthly' as const },
  { url: `${BASE}/contact`,      priority: 0.5, changeFrequency: 'monthly' as const },
  { url: `${BASE}/privacy`,      priority: 0.4, changeFrequency: 'monthly' as const },
  { url: `${BASE}/terms`,        priority: 0.4, changeFrequency: 'monthly' as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 고정 페이지
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(p => ({
    url: p.url,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // 지역별 모아보기 17개
  const regionEntries: MetadataRoute.Sitemap = REGIONS.map(r => ({
    url: `${BASE}/region/${encodeURIComponent(r)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // 시/군/구 상세 페이지
  const sigunguEntries: MetadataRoute.Sitemap = REGIONS.flatMap(sido => {
    const districts = LAWD_CODE_MAP[sido as keyof typeof LAWD_CODE_MAP] ?? [];
    return districts.map(d => ({
      url: `${BASE}/region/${encodeURIComponent(sido)}/${encodeURIComponent(d.name)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));
  });

  // 청약정보 개별 페이지 /sale/[houseManageNo]
  // 현재 100건을 sale_history에 upsert → 누적된 전체 목록으로 사이트맵 생성
  let saleItems: import('@/lib/publicDataApi').PublicSaleItem[] = [];
  try {
    const { items } = await fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true });
    saleItems = items;

    // 현재 항목을 sale_history에 누적 저장 (중복 무시)
    if (items.length > 0) {
      await serviceDb().from('sale_history').upsert(
        items.map(item => ({
          house_manage_no: item.houseManageNo,
          name: item.name,
          updated_at: now.toISOString(),
        })),
        { onConflict: 'house_manage_no' }
      );
    }
  } catch {}

  // 사이트맵은 현재 100건 + 누적된 전체 history 합산
  const currentSet = new Set(saleItems.map(i => i.houseManageNo));
  let historyItems: { house_manage_no: string; updated_at: string }[] = [];
  try {
    const { data } = await serviceDb()
      .from('sale_history')
      .select('house_manage_no, updated_at')
      .order('updated_at', { ascending: false });
    historyItems = data ?? [];
  } catch {}

  const saleEntries: MetadataRoute.Sitemap = [
    // 현재 진행 중인 청약
    ...saleItems.map(item => ({
      url: `${BASE}/sale/${item.houseManageNo}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: item.status === '청약중' ? 0.95 : item.status?.includes('예정') ? 0.9 : 0.85,
    })),
    // 이미지·글이 작성된 과거 단지 — content가 있는 경우만 색인 가치 있음
    ...historyItems
      .filter(h => !currentSet.has(h.house_manage_no))
      .map(h => ({
        url: `${BASE}/sale/${h.house_manage_no}`,
        lastModified: new Date(h.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ];

  // 분양정보 개별 매물 (Supabase)
  let unsoldItems: { id: string; slug: string | null; updated_at: string }[] = [];
  try {
    const { data } = await supabase
      .from('unsold_listings')
      .select('id, slug, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    unsoldItems = data ?? [];
  } catch {}

  const unsoldEntries: MetadataRoute.Sitemap = unsoldItems.map(item => ({
    url: `${BASE}/unsold/${item.slug ?? item.id}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // apt 포스트 — data.ts에서 자동으로 읽어 사이트맵 생성 (수동 목록 불필요)
  const aptEntries: MetadataRoute.Sitemap = aptPosts.map(post => ({
    url: `${BASE}/apt/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // blog 포스트
  const BLOG_SLUGS = [
    'acquisition-tax-guide-2025','loan-repayment-comparison','intermediate-payment-interest-tips',
    'real-estate-roi-guide','brokerage-fee-saving-tips','jeonse-vs-monthly-rent-2025',
    'apartment-purchase-checklist','mortgage-loan-tips-2025','real-estate-tax-comprehensive',
    'first-home-buyer-guide','apartment-vs-villa-comparison','real-estate-contract-checklist',
    'capital-gains-tax-guide','officetel-investment-pros-cons','mortgage-loan-complete-guide-2025',
    'bogeumjari-vs-didimdol-2025','dsr-ratio-loan-limit-strategy','mortgage-interest-rate-negotiation',
    'mortgage-prepayment-strategy','mortgage-types-comparison','ltv-dtidsr-deep-dive',
    'mortgage-fixed-vs-variable-2025','mortgage-application-documents','mortgage-loan-repayment-early-payoff',
    'apartment-management-fee-saving-tips','real-estate-auction-guide','housing-subscription-savings-guide',
    'move-in-checklist-guide','apartment-registration-tax-guide','real-estate-gap-investment-risk',
    'real-estate-calculator-guide','apartment-subscription-info-guide',
    'unsold-apartment-benefits-guide-2026','subscription-score-guide-2026','apartment-real-price-lookup-guide-2026',
    'unsold-apartment-investment-strategy-2026','first-home-subscription-complete-guide-2026',
    'apartment-transfer-income-tax-guide-2026',
    'real-estate-market-outlook-2026','jeonse-fraud-prevention-complete-guide-2026',
  ];

  const blogEntries: MetadataRoute.Sitemap = BLOG_SLUGS.map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...regionEntries,
    ...sigunguEntries,
    ...saleEntries,
    ...unsoldEntries,
    ...aptEntries,
    ...blogEntries,
  ];
}
