import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { optimizeToWebP } from '@/lib/imageOptimize';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_token')?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const type = (formData.get('type') as string) ?? 'content'; // 'thumbnail' | 'content'
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const isGif = file.type === 'image/gif';
  const maxWidth = type === 'thumbnail' ? 800 : 1200;
  const quality = type === 'thumbnail' ? 82 : 85;
  const optimized = isGif ? raw : await optimizeToWebP(raw, { maxWidth, quality });
  const ext = isGif ? 'gif' : 'webp';
  const fileName = `${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from('blog-images')
    .upload(fileName, optimized, { contentType: isGif ? 'image/gif' : 'image/webp', upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(fileName);
  if (!urlData?.publicUrl) return NextResponse.json({ error: 'URL 생성 실패' }, { status: 500 });

  return NextResponse.json({ url: urlData.publicUrl });
}
