import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'omega_admin_session';
const maxAgeSeconds = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'omega-shift-manager-dev-secret';
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createAdminSession(account: { id: string; company_id: string; login_id: string; name: string }) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = base64url(JSON.stringify({ ...account, exp: expiresAt }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSession(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number; id: string; company_id: string; login_id: string; name: string };
  if (!session.exp || session.exp < Date.now()) return null;
  return session;
}

export const adminSessionMaxAge = maxAgeSeconds;
