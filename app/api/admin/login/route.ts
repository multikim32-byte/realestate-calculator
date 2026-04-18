import { NextRequest, NextResponse } from 'next/server';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15분

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();

  const record = loginAttempts.get(ip);
  if (record) {
    if (now < record.resetAt) {
      if (record.count >= MAX_ATTEMPTS) {
        const remainMin = Math.ceil((record.resetAt - now) / 60000);
        return NextResponse.json(
          { error: `로그인 시도가 너무 많습니다. ${remainMin}분 후 다시 시도해주세요.` },
          { status: 429 }
        );
      }
    } else {
      loginAttempts.delete(ip);
    }
  }

  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    const cur = loginAttempts.get(ip);
    if (cur && now < cur.resetAt) {
      cur.count += 1;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  loginAttempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_token', process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1일
  });
  return res;
}
