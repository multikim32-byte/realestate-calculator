import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ item: null });

  const { data } = await supabase
    .from('unsold_listings')
    .select('id, name, thumbnail_url, benefit, min_price')
    .eq('house_manage_no', id)
    .eq('is_active', true)
    .maybeSingle();

  return NextResponse.json({ item: data ?? null });
}
