import { NextRequest, NextResponse } from 'next/server';
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
    .from('sale_content')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  if (!body.house_manage_no) return NextResponse.json({ error: 'house_manage_no 필수' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sale_content')
    .upsert(
      { ...body, updated_at: new Date().toISOString() },
      { onConflict: 'house_manage_no' }
    )
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
