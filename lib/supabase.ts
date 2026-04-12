import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UnsoldSection = {
  name: string;
  images: string[];
};

export type UnsoldListing = {
  id: string;
  name: string;
  location: string;
  category: string;
  total_units: number | null;
  remaining_units: number | null;
  min_price: number | null;
  max_price: number | null;
  area: string | null;
  benefit: string | null;
  official_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  sections: UnsoldSection[];
  highlight: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const CATEGORIES = ['전체', '아파트', '오피스텔', '도시형생활주택', '상가', '지식산업센터'];

export const DEFAULT_SECTIONS: UnsoldSection[] = [
  { name: '분양일정', images: [] },
  { name: '공급안내', images: [] },
  { name: '사업개요', images: [] },
  { name: '입지환경', images: [] },
  { name: '프리미엄', images: [] },
  { name: '평면도', images: [] },
];
