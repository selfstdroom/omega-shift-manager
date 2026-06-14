import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'omega_admin_session';

const publicPaths = ['/admin/login', '/staff/login', '/staff/signup'];

function hasSupabaseAuthCookie(request: NextRequest) {
  return Boolean(request.cookies.get('omega_staff_session')?.value) || request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.includes(pathname) || pathname.startsWith('/demo/')) return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    const hasAdminSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!hasAdminSessionCookie) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (pathname.startsWith('/staff') && !hasSupabaseAuthCookie(request)) {
    return NextResponse.redirect(new URL('/staff/login', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/staff/:path*'] };
