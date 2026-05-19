import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { optimizeToWebP } from '@/lib/imageOptimize';
import { uploadToR2 } from '@/lib/r2';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get('admin_token')?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다 (jpg, png, webp, gif만 가능)' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 });
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const isGif = file.type === 'image/gif';
    const optimized = isGif ? raw : await optimizeToWebP(raw, { maxWidth: 900, quality: 82 });
    const key = `unsold/${Date.now()}-${Math.random().toString(36).slice(2)}.${isGif ? 'gif' : 'webp'}`;
    const url = await uploadToR2(key, optimized, isGif ? 'image/gif' : 'image/webp');
    return NextResponse.json({ url });
  } catch (e) {
    console.error('업로드 실패:', e);
    return NextResponse.json({ error: `업로드 실패: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
