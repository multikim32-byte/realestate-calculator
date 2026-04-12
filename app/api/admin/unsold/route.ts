import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

function isAdmin() {
  const token = cookies().get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

// GET: 전체 목록 (관리자용, is_active 무관)
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unsold_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새 매물 등록
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unsold_listings')
    .insert([{ ...body, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
