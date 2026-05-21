import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15분

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = new Date();
  const db = serviceDb();

  // 현재 IP의 시도 기록 조회
  const { data: record } = await db
    .from('login_attempts')
    .select('count, reset_at')
    .eq('ip', ip)
    .maybeSingle();

  if (record) {
    const resetAt = new Date(record.reset_at);
    if (now < resetAt && record.count >= MAX_ATTEMPTS) {
      const remainMin = Math.ceil((resetAt.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        { error: `로그인 시도가 너무 많습니다. ${remainMin}분 후 다시 시도해주세요.` },
        { status: 429 }
      );
    }
  }

  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    const withinWindow = record && new Date(record.reset_at) > now;
    await db.from('login_attempts').upsert({
      ip,
      count: withinWindow ? record!.count + 1 : 1,
      reset_at: withinWindow ? record!.reset_at : new Date(now.getTime() + WINDOW_MS).toISOString(),
    });
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  // 로그인 성공 — 기록 삭제
  await db.from('login_attempts').delete().eq('ip', ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return res;
}
