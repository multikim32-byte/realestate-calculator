import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { unsold_id, name, phone } = await req.json();
  if (!unsold_id || !name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }
  const { error } = await supabase
    .from('unsold_leads')
    .insert({ unsold_id, name: name.trim(), phone: phone.trim() });
  if (error) return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unsoldId = req.nextUrl.searchParams.get('unsold_id');
  let query = supabase
    .from('unsold_leads')
    .select('*, unsold_listings(name)')
    .order('created_at', { ascending: false });
  if (unsoldId) query = query.eq('unsold_id', unsoldId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, memo, status } = await req.json();
  if (!id) return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  const update: Record<string, string | undefined> = {};
  if (memo !== undefined) update.memo = memo;
  if (status !== undefined) update.status = status;
  const { error } = await supabase.from('unsold_leads').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  const { error } = await supabase.from('unsold_leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
