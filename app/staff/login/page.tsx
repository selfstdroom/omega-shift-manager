'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!isSupabaseConfigured || !supabase) {
          if (mounted) setMessage('Supabaseに接続できません。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。');
          return;
        }

        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('session-timeout')), 8000)),
        ]);
        if (error) {
          if (mounted) setMessage('認証状態を確認できませんでした。メールアドレスとパスワードでログインしてください。');
          return;
        }

        if (data.session) {
          document.cookie = 'omega_staff_session=1; path=/; max-age=28800; SameSite=Lax';
          router.replace('/staff');
        }
      } catch {
        if (mounted) setMessage('認証状態を確認できませんでした。メールアドレスとパスワードでログインしてください。');
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    checkSession();
    return () => { mounted = false; };
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Supabaseに接続できません。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`ログインに失敗しました: ${error.message}`);
        return;
      }

      document.cookie = 'omega_staff_session=1; path=/; max-age=28800; SameSite=Lax';
      router.replace('/staff');
    } catch {
      setMessage('ログインに失敗しました。Supabaseへの接続状態と入力内容を確認してください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl rounded-xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold">スタッフログイン</h1>
      <p className="mt-2 text-sm text-slate-600">メールアドレスとパスワードでログインしてください。</p>
      {checkingAuth && <p className="mt-4 rounded bg-blue-50 p-3 text-blue-700">認証状態を確認しています...</p>}
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className="w-full rounded border p-2" type="email" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="パスワード" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading || checkingAuth} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{loading ? 'ログイン中...' : 'ログイン'}</button>
      </form>
      <Link className="mt-4 inline-block text-sm text-blue-700" href="/staff/signup">新規登録はこちら</Link>
      {message && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}
    </div>
  );
}
