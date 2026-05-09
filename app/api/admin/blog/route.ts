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

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { data, error } = await admin
    .from('blog_posts')
    .select('id, slug, title, description, category, is_published, published_at, thumbnail_url, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  const { slug, title, description, content, thumbnail_url, category, is_published } = body;
  if (!slug || !title || !description) {
    return NextResponse.json({ error: 'slug, title, description 필수' }, { status: 400 });
  }
  const now = new Date().toISOString();
  const { data, error } = await admin.from('blog_posts').insert({
    slug: slug.trim(),
    title: title.trim(),
    description: description.trim(),
    content: content ?? '',
    thumbnail_url: thumbnail_url ?? null,
    category: category ?? '부동산정보',
    is_published: is_published ?? false,
    published_at: is_published ? now : null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
