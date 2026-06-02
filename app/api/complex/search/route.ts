import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from('apartment_complexes')
    .select('slug, name, sido, sigungu, dong, total_units, built_year')
    .ilike('name', `%${q}%`)
    .not('lat', 'is', null)
    .order('name')
    .limit(10);

  return NextResponse.json({ results: data ?? [] }, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
