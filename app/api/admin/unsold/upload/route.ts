import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

function isAdmin() {
  const token = cookies().get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from('unsold-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('unsold-images')
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
