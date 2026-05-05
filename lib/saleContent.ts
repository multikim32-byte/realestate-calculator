import { supabase } from './supabase';

export type SaleContent = {
  id: string;
  house_manage_no: string;
  summary: string | null;
  description: string | null;
  pros: string[] | null;
  cons: string[] | null;
  thumbnail_url: string | null;
  image_urls: string[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchSaleContent(houseManageNo: string): Promise<SaleContent | null> {
  try {
    const { data } = await supabase
      .from('sale_content')
      .select('*')
      .eq('house_manage_no', houseManageNo)
      .eq('is_published', true)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}
