import { NextResponse, type NextRequest } from 'next/server';

// DEMO MODE: authentication redirects are intentionally disabled so /admin/** and /staff/**
// can be reviewed without logging in. Keep this middleware in place so the original
// guard can be restored after UI / flow verification.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/staff/:path*'] };
