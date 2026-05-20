import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { fetchPublicSaleList } from '@/lib/publicDataApi';
import AdminHeader from '../components/AdminHeader';
import KakaoContentClient from './KakaoContentClient';

export const dynamic = 'force-dynamic';

export default async function KakaoContentPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) redirect('/admin');

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [saleResult, { data: unsoldRaw }, { data: tradeStatsRaw }] = await Promise.all([
    fetchPublicSaleList({ type: 'all', perPage: 100, skipEnrich: true }),
    db.from('unsold_listings')
      .select('id, name, location, category, min_price, max_price, highlight')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('trade_stats')
      .select('*')
      .order('stat_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(today).getTime();
  const in3Days = new Date(todayMs + 3 * 86400000).toISOString().slice(0, 10);
  const in7Days = new Date(todayMs + 7 * 86400000).toISOString().slice(0, 10);

  // 이번주 월~일 계산
  const todayDate = new Date();
  const daysFromMonday = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const thisWeekStart = monday.toISOString().slice(0, 10);
  const thisWeekEnd = sunday.toISOString().slice(0, 10);

  const active = (saleResult.items ?? []).filter(it => it.receiptStart && it.receiptEnd);
  const ongoing = active.filter(it => it.receiptStart <= today && it.receiptEnd >= today);
  const closingSoon = ongoing.filter(it => it.receiptEnd <= in3Days);
  const ongoingOnly = ongoing.filter(it => it.receiptEnd > in3Days);
  const upcoming = active.filter(it => it.receiptStart > today && it.receiptStart <= in7Days);
  const weeklyItems = active.filter(it => it.receiptStart <= thisWeekEnd && it.receiptEnd >= thisWeekStart);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminHeader />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>카카오 채널 소식 생성</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>
          오늘의 청약·미분양 데이터로 채널 소식 텍스트를 자동 생성합니다. 수정 후 복사하여 채널 관리자 앱에 붙여넣기 하세요.
        </p>
        <KakaoContentClient
          ongoingItems={ongoingOnly.slice(0, 5).map(it => ({ name: it.name, location: it.location, receiptEnd: it.receiptEnd, winnerDate: it.winnerDate }))}
          closingSoonItems={closingSoon.map(it => ({ name: it.name, location: it.location, receiptEnd: it.receiptEnd, winnerDate: it.winnerDate }))}
          upcomingItems={upcoming.slice(0, 5).map(it => ({ name: it.name, location: it.location, receiptStart: it.receiptStart, winnerDate: it.winnerDate }))}
          unsoldItems={(unsoldRaw ?? []).slice(0, 4).map(it => ({
            name: it.name,
            location: it.location,
            category: it.category,
            min_price: it.min_price,
            max_price: it.max_price,
            highlight: it.highlight,
          }))}
          weeklyItems={weeklyItems.map(it => ({ name: it.name, location: it.location, receiptStart: it.receiptStart, receiptEnd: it.receiptEnd }))}
          thisWeekStart={thisWeekStart}
          thisWeekEnd={thisWeekEnd}
          today={today}
          tradeStats={tradeStatsRaw ?? null}
        />
      </div>
    </div>
  );
}
