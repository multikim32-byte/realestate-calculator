import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { fetchSaleDetail } from '@/lib/publicDataApi';
import SaleContentForm from '../SaleContentForm';
import type { SaleContent } from '@/lib/saleContent';

export default async function SaleContentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_token')?.value !== process.env.ADMIN_SECRET) {
    redirect('/admin');
  }

  const { id } = await params; // id = houseManageNo

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('sale_content')
    .select('*')
    .eq('house_manage_no', id)
    .maybeSingle();

  // 청약홈 API에서 기본 정보 조회 (참고용)
  let saleRef = null;
  try {
    const detail = await fetchSaleDetail(id);
    if (detail) {
      saleRef = {
        name: detail.name,
        location: detail.location,
        buildingType: detail.buildingType,
        totalUnits: detail.totalUnits,
        receiptStart: detail.receiptStart,
        receiptEnd: detail.receiptEnd,
        status: detail.status,
      };
    }
  } catch { /* API 조회 실패 시 무시 */ }

  return (
    <SaleContentForm
      houseManageNo={id}
      initial={existing as SaleContent | null}
      saleRef={saleRef}
    />
  );
}
