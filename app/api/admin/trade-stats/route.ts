import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? 'monthly';
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('trade_stats')
    .select('*')
    .eq('period', period)
    .order('stat_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // period 컬럼 없을 경우(마이그레이션 전) fallback: 월간 최신 데이터 반환
    if (period === 'monthly') {
      const { data: fallback, error: fe } = await supabase
        .from('trade_stats')
        .select('*')
        .order('stat_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
      return NextResponse.json(fallback ?? null, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(data ?? null, { headers: { 'Cache-Control': 'no-store' } });
}
