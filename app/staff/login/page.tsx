'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function StaffLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !supabase) { setMessage('Supabaseに接続できません。環境変数を設定してください。'); return; }
    setLoading(true); setMessage('');
    const res = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (res.error) { setMessage(res.error.message); setLoading(false); return; }
    const user = res.data.user;
    if (mode === 'signup' && user) {
      const { id: userId } = user;
      const { data: workplace } = await supabase.from('workplaces').select('id, company_id').limit(1).maybeSingle();
      if (workplace) await supabase.from('profiles').upsert({ id: userId, company_id: workplace.company_id, workplace_id: workplace.id, name: name || email, role: 'staff', staff_role: 'staff' });
    }
    router.replace('/staff');
  }

  return <div className="max-w-xl rounded-xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">{mode === 'login' ? 'スタッフログイン' : 'スタッフメール登録'}</h1><form onSubmit={submit} className="mt-5 space-y-3">{mode === 'signup' && <input className="w-full rounded border p-2" placeholder="氏名" value={name} onChange={e=>setName(e.target.value)} required />}<input className="w-full rounded border p-2" type="email" placeholder="メール" value={email} onChange={e=>setEmail(e.target.value)} required /><input className="w-full rounded border p-2" type="password" placeholder="パスワード" value={password} onChange={e=>setPassword(e.target.value)} required /><button disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white">{loading?'処理中...': mode === 'login' ? 'ログイン' : '登録'}</button></form><button className="mt-4 text-sm text-blue-700" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'新規登録はこちら':'ログインに戻る'}</button>{message && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}</div>;
}
