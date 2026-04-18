import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (token !== process.env.ADMIN_SECRET) return NextResponse.json({ error: '권한 없음' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다 (jpg, png, webp, gif만 가능)' }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다' }, { status: 400 });

  const EXT_MAP: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = EXT_MAP[file.type];
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from('unsold-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from('unsold-images')
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) return NextResponse.json({ error: 'URL 생성 실패' }, { status: 500 });

  return NextResponse.json({ url: urlData.publicUrl });
}
