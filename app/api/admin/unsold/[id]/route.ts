import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  return token === process.env.ADMIN_SECRET;
}

// PUT: 매물 수정
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('unsold_listings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: '매물 수정에 실패했습니다.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: '해당 매물을 찾을 수 없습니다.' }, { status: 404 });
  revalidatePath('/unsold');
  revalidatePath(`/unsold/${id}`);
  if (data?.slug) revalidatePath(`/unsold/${data.slug}`);
  return NextResponse.json(data);
}

// DELETE: 매물 삭제
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: '권한 없음' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();

  // 삭제 전 slug 조회 (삭제 후엔 알 수 없음)
  const { data: listing } = await supabase
    .from('unsold_listings')
    .select('id, slug')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('unsold_listings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: '매물 삭제에 실패했습니다.' }, { status: 500 });

  revalidatePath('/unsold');
  revalidatePath(`/unsold/${id}`);                      // UUID URL 캐시 즉시 무효화
  if (listing?.slug) revalidatePath(`/unsold/${listing.slug}`); // slug URL 캐시 즉시 무효화

  return NextResponse.json({ ok: true });
}
