import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OLD_HOSTS = ['mk-land.kr', 'www.mk-land.kr'];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  if (OLD_HOSTS.some(h => host === h || host.startsWith(h + ':'))) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'www.aptzipsa.kr';
    url.port = '';
    return NextResponse.redirect(url, { status: 301 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
