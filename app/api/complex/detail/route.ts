import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export type NearbyItem = { name: string; distance: number; category?: string; label?: string; school_type?: string };

export type ComplexNearby = {
  nearby_transit: NearbyItem[] | null;
  nearby_schools: NearbyItem[] | null;
  nearby_infra:   NearbyItem[] | null;
};

export async function GET(req: NextRequest) {
  const kapt_code = req.nextUrl.searchParams.get('kapt_code');
  if (!kapt_code) return NextResponse.json({});

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from('apartment_complexes')
    .select('nearby_transit, nearby_schools, nearby_infra')
    .eq('kapt_code', kapt_code)
    .single();

  return NextResponse.json(data ?? {}, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
