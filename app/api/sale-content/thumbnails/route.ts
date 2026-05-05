import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('sale_content')
      .select('house_manage_no, thumbnail_url')
      .eq('is_published', true)
      .not('thumbnail_url', 'is', null);

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.thumbnail_url) map[row.house_manage_no] = row.thumbnail_url;
    }

    const res = NextResponse.json(map);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch {
    return NextResponse.json({});
  }
}
