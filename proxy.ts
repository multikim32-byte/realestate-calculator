import { NextRequest, NextResponse } from 'next/server';

const OLD_HOSTS = ['mk-land.kr', 'www.mk-land.kr'];

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? '';

  // mk-land.kr → aptzipsa.kr 301 영구 리다이렉트
  if (OLD_HOSTS.some(h => host === h || host.startsWith(h + ':'))) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'www.aptzipsa.kr';
    url.port = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const token = req.cookies.get('admin_token')?.value;
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
