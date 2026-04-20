import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BASE = 'https://www.mk-land.kr';

const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

const STATIC_PAGES = [
  { url: `${BASE}`,              priority: 1.0, changeFrequency: 'daily'   as const },
  { url: `${BASE}/calendar`,     priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/trade`,        priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/unsold`,       priority: 0.9, changeFrequency: 'daily'   as const },
  { url: `${BASE}/calculator`,   priority: 0.8, changeFrequency: 'weekly'  as const },
  { url: `${BASE}/apt`,          priority: 0.8, changeFrequency: 'weekly'  as const },
  { url: `${BASE}/favorites`,    priority: 0.6, changeFrequency: 'weekly'  as const },
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
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // 분양정보 개별 매물 (Supabase)
  let unsoldItems: { id: string; updated_at: string }[] = [];
  try {
    const { data } = await supabase
      .from('unsold_listings')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    unsoldItems = data ?? [];
  } catch {}

  const unsoldEntries: MetadataRoute.Sitemap = unsoldItems.map(item => ({
    url: `${BASE}/unsold/${item.id}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // apt 포스트
  // dsr-calculation-guide, prepayment-penalty-guide → blog로 301 리디렉션 처리됨 (중복 제거)
  const APT_SLUGS = [
    'apartment-subscription-guide-2026','presale-price-ceiling-guide','new-apartment-subscription-score',
    'presale-rights-transfer','pre-sale-vs-resale-apartment','acquisition-tax-guide','mortgage-loan-guide',
    'jeonse-vs-monthly-rent','capital-gains-tax-real-estate','reconstruction-redevelopment-guide',
    'real-estate-brokerage-fee','officetel-investment-guide','lease-contract-renewal-law',
    'real-estate-tax-overview','small-commercial-investment','mortgage-ltv-limit-guide',
    'fixed-vs-variable-rate-2026','didimdol-loan-guide','bogeumjari-loan-vs-bank',
    'mortgage-refinancing-guide','repayment-method-comparison','newborn-special-loan-guide',
    'first-home-buyer-loan-support','apartment-lottery-strategy',
    'mortgage-stress-dsr-guide','mortgage-jeonse-loan-guide','jeonse-fraud-prevention-guide',
  ];

  const aptEntries: MetadataRoute.Sitemap = APT_SLUGS.map(slug => ({
    url: `${BASE}/apt/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
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
    'real-estate-calculator-guide','apartment-subscription-info-guide','mk-land-real-estate-tools-guide',
    'unsold-apartment-benefits-guide-2026','subscription-score-guide-2026','apartment-real-price-lookup-guide-2026',
    'unsold-apartment-investment-strategy-2026','first-home-subscription-complete-guide-2026',
    'mk-land-unsold-listing-launch-2026','apartment-transfer-income-tax-guide-2026',
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
    ...unsoldEntries,
    ...aptEntries,
    ...blogEntries,
  ];
}
