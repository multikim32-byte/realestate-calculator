import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export type UnitType = {
  house_ty: string;
  supply_area: number;
  exclusive_area: number;
  supply_pyeong: number;
  exclusive_pyeong: number;
  count: number;
  source: 'cheongak' | 'estimate';
};

export type MapComplex = {
  kapt_code: string;
  name: string;
  slug: string;
  sido: string;
  sigungu: string;
  lat: number;
  lng: number;
  total_units: number | null;
  built_year: number | null;
  avg_pyeong: number | null;
  avg_price: number | null;
  unit_types: UnitType[] | null;
  road_address: string | null;
  kapt_addr: string | null;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const swLat = parseFloat(sp.get('swLat') ?? '0');
  const swLng = parseFloat(sp.get('swLng') ?? '0');
  const neLat = parseFloat(sp.get('neLat') ?? '0');
  const neLng = parseFloat(sp.get('neLng') ?? '0');

  if (!swLat || !swLng || !neLat || !neLng) {
    return NextResponse.json({ complexes: [] });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from('apartment_complexes')
    .select('kapt_code, name, slug, sido, sigungu, lat, lng, total_units, built_year, avg_pyeong, avg_price, unit_types, road_address, kapt_addr')
    .gte('lat', swLat).lte('lat', neLat)
    .gte('lng', swLng).lte('lng', neLng)
    .not('lat', 'is', null)
    .neq('source', 'kapt_deprecated')
    .limit(300);

  return NextResponse.json({ complexes: data ?? [] }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
