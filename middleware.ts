import { NextResponse, type NextRequest } from 'next/server';
const ADMIN_SESSION_COOKIE = 'omega_admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasAdminSession = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!hasAdminSession) return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
