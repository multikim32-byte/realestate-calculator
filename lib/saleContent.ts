import { createAdminClient } from './supabaseAdmin';

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

// 서버 컴포넌트 전용 — service role key 사용으로 RLS 우회
export async function fetchSaleContent(houseManageNo: string): Promise<SaleContent | null> {
  try {
    const supabase = createAdminClient();
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
