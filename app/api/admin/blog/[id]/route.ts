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

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await admin.from('blog_posts').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  const fields = ['slug', 'title', 'description', 'content', 'thumbnail_url', 'category', 'is_published'];
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f];
  }
  if (body.is_published === true && !body.published_at) {
    update.published_at = new Date().toISOString();
  }
  const { error } = await admin.from('blog_posts').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const { error } = await admin.from('blog_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
