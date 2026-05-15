import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkAuth() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await db().from('sale_schedule_notes').select('*').order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  if (body.is_custom) {
    const { data, error } = await db().from('sale_schedule_notes').insert({
      is_custom: true,
      memo: body.memo ?? '',
      custom_name: body.custom_name,
      custom_location: body.custom_location,
      custom_receipt_start: body.custom_receipt_start,
      custom_receipt_end: body.custom_receipt_end,
      custom_winner_date: body.custom_winner_date,
      custom_contact: body.custom_contact,
      custom_url: body.custom_url,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // API 항목 메모 저장 (upsert by house_manage_no)
  const { data: existing } = await db()
    .from('sale_schedule_notes')
    .select('id')
    .eq('house_manage_no', body.house_manage_no)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db()
      .from('sale_schedule_notes')
      .update({ memo: body.memo, is_hidden: body.is_hidden ?? false })
      .eq('id', existing.id)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { data, error } = await db()
      .from('sale_schedule_notes')
      .insert({ house_manage_no: body.house_manage_no, memo: body.memo ?? '', is_hidden: body.is_hidden ?? false })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}

export async function DELETE(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  if (body.id) {
    await db().from('sale_schedule_notes').delete().eq('id', body.id);
  } else if (body.house_manage_no) {
    // API 항목은 숨김 처리 (soft delete)
    const { data: existing } = await db()
      .from('sale_schedule_notes')
      .select('id')
      .eq('house_manage_no', body.house_manage_no)
      .maybeSingle();

    if (existing) {
      await db().from('sale_schedule_notes').update({ is_hidden: true }).eq('id', existing.id);
    } else {
      await db().from('sale_schedule_notes').insert({ house_manage_no: body.house_manage_no, is_hidden: true, memo: '' });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  // 숨김 해제
  const { data, error } = await db()
    .from('sale_schedule_notes')
    .update({ is_hidden: false })
    .eq('id', body.id)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
