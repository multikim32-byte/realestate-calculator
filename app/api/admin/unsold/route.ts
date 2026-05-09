import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { generateUnsoldSlug } from '@/lib/unsoldSlug';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

// GET: 전체 목록 (관리자용, is_active 무관)
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unsold_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 새 매물 등록
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const body = await req.json();
  const supabase = createAdminClient();

  // slug 자동 생성 (중복 시 숫자 suffix 추가)
  const baseSlug = body.slug || generateUnsoldSlug(body.name ?? '', body.location ?? '');
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const { data: existing } = await supabase.from('unsold_listings').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${attempt++}`;
  }

  const { data, error } = await supabase
    .from('unsold_listings')
    .insert([{ ...body, slug, updated_at: new Date().toISOString() }])
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: '매물 등록에 실패했습니다.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '등록 후 데이터를 찾을 수 없습니다.' }, { status: 500 });
  revalidatePath('/unsold');
  revalidatePath(`/unsold/${data.slug ?? data.id}`);
  return NextResponse.json(data);
}
