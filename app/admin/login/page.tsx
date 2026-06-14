'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: loginId, password }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(result.error ?? 'ログインに失敗しました。');
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">管理者ログイン</h1><p className="mt-2 text-sm text-slate-600">発行されたログインIDとパスワードでログインしてください。</p><form onSubmit={submit} className="mt-5 space-y-3"><input className="w-full rounded border p-2" placeholder="ログインID" value={loginId} onChange={e=>setLoginId(e.target.value)} required autoComplete="username" /><input className="w-full rounded border p-2" type="password" placeholder="パスワード" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" /><button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{loading?'処理中...':'ログイン'}</button></form>{message && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}</div>;
}
