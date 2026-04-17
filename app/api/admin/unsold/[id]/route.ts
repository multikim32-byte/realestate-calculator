import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

// PUT: 매물 수정
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unsold_listings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: '매물 수정에 실패했습니다.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '해당 매물을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE: 매물 삭제
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('unsold_listings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: '매물 삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
