import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

const publicPaths = ['/admin/login', '/staff/login', '/staff/signup'];

function adminSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'omega-shift-manager-dev-secret';
}

async function verifyAdminToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(adminSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (expected !== signature) return false;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const session = JSON.parse(atob(normalized)) as { exp?: number };
    return Boolean(session.exp && session.exp > Date.now());
  } catch {
    return false;
  }
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return Boolean(request.cookies.get('omega_staff_session')?.value) || request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.includes(pathname) || pathname.startsWith('/demo/')) return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    const ok = await verifyAdminToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!ok) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (pathname.startsWith('/staff') && !hasSupabaseAuthCookie(request)) {
    return NextResponse.redirect(new URL('/staff/login', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/staff/:path*'] };
