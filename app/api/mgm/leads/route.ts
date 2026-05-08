import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value === process.env.ADMIN_SECRET;
}

// GET — 어드민 전용: MGM 리드 목록
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { data, error } = await admin
    .from('mgm_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — 사용자 MGM 신청 제출
export async function POST(req: NextRequest) {
  const { house_manage_no, name, birth_date, phone, address } = await req.json();
  if (!house_manage_no || !name || !birth_date || !phone || !address) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 });
  }

  const phoneClean = phone.replace(/[^0-9]/g, '');
  if (phoneClean.length < 10) {
    return NextResponse.json({ error: '올바른 전화번호를 입력해주세요.' }, { status: 400 });
  }

  const { error } = await admin.from('mgm_leads').insert({
    house_manage_no,
    name: name.trim(),
    birth_date: birth_date.trim(),
    phone: phoneClean,
    address: address.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — 어드민 전용: 메모 수정
export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id, memo } = await req.json();
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  const { error } = await admin.from('mgm_leads').update({ memo }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — 어드민 전용: 리드 삭제
export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  const { error } = await admin.from('mgm_leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
