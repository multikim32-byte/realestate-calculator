import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from('trade_stats')
    .select('stat_date, period, rising, falling, top_price, top_volume, total_trades_current, total_trades_prev')
    .eq('period', 'monthly')
    .order('stat_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(data ?? {}, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
