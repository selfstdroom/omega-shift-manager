import { NextResponse } from 'next/server';
import { createAdminSession, ADMIN_SESSION_COOKIE, adminSessionMaxAge } from '@/lib/adminSession';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

type AdminAccount = { id: string; company_id: string; login_id: string; name: string };

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { login_id, password } = await request.json();
  if (!login_id || !password) return NextResponse.json({ error: 'ログインIDとパスワードを入力してください。' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabaseに接続できません。.env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。' }, { status: 500 });

  const { data, error } = await supabase
    .from('admin_accounts')
    .select('id, company_id, login_id, name')
    .eq('login_id', login_id)
    .eq('password_text', password)
    .maybeSingle<AdminAccount>();
  if (error) return NextResponse.json({ error: `管理者認証の照合に失敗しました: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'ログインIDまたはパスワードが正しくありません。' }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(data), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: adminSessionMaxAge });
  return response;
}
