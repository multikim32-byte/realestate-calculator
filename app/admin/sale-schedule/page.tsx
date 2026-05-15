import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { fetchPublicSaleList } from '@/lib/publicDataApi';
import type { PublicSaleItem } from '@/lib/publicDataApi';
import AdminHeader from '../components/AdminHeader';
import SaleScheduleClient from './SaleScheduleClient';

export const dynamic = 'force-dynamic';

export type ScheduleNote = {
  id: string;
  house_manage_no: string | null;
  memo: string;
  is_hidden: boolean;
  is_custom: boolean;
  custom_name: string | null;
  custom_location: string | null;
  custom_receipt_start: string | null;
  custom_receipt_end: string | null;
  custom_winner_date: string | null;
  custom_contact: string | null;
  custom_url: string | null;
  created_at: string;
};

export default async function SaleSchedulePage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) redirect('/admin');

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [saleResult, { data: notesRaw }] = await Promise.all([
    fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true }),
    db.from('sale_schedule_notes').select('*').order('created_at', { ascending: false }),
  ]);

  const items: PublicSaleItem[] = saleResult.items ?? [];
  const notes: ScheduleNote[] = (notesRaw ?? []) as ScheduleNote[];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminHeader />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>청약 일정 관리</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>청약홈 API 기준 최근 100건 · 메모·추가·삭제·엑셀 다운로드 지원</p>
        </div>
        <SaleScheduleClient items={items} notes={notes} />
      </div>
    </div>
  );
}
