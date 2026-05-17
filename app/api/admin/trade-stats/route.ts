import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('trade_stats')
    .select('*')
    .order('stat_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
