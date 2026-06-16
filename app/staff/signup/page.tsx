'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDefaultStaffScope } from '@/lib/staffAuth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';

type Workplace = { id: string; company_id: string; name: string };

export default function StaffSignupPage() {
  const router = useRouter();
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', workplace_id: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.from('workplaces').select('id, company_id, name').then(({ data }) => {
      const rows = (data ?? []) as Workplace[];
      setWorkplaces(rows);
      if (rows[0]) setForm((current) => ({ ...current, workplace_id: rows[0].id }));
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !supabase) { setMessage('Supabaseに接続できません。環境変数を設定してください。'); return; }
    setLoading(true); setMessage('');
    let companyId = '';
    let workplaceId = form.workplace_id;
    try {
      const defaults = await getDefaultStaffScope();
      const selectedWorkplace = workplaces.find((item) => item.id === form.workplace_id);
      companyId = selectedWorkplace?.company_id ?? defaults.company_id;
      workplaceId = selectedWorkplace?.id ?? defaults.workplace_id;
    } catch (error) {
      setMessage((error as Error).message);
      setLoading(false);
      return;
    }
    const result = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { name: form.name, phone: form.phone } } });
    if (result.error || !result.data.user) { setMessage(result.error?.message ?? '登録に失敗しました。'); setLoading(false); return; }
    const { error } = await supabase.from('profiles').upsert({ id: result.data.user.id, company_id: companyId, workplace_id: workplaceId, name: form.name, role: 'staff', staff_role: 'staff', phone: form.phone }, { onConflict: 'id' });
    setLoading(false);
    if (error) { setMessage(`プロフィール作成に失敗しました: ${error.message}`); return; }
    document.cookie = 'omega_staff_session=1; path=/; max-age=28800; SameSite=Lax';
    router.replace('/staff');
    router.refresh();
  }

  return <div className="max-w-xl rounded-xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">スタッフ新規登録</h1><p className="mt-2 text-sm text-slate-600">Supabase Authにアカウントを作成し、スタッフプロフィールを登録します。</p><form onSubmit={submit} className="mt-5 space-y-3"><input className="w-full rounded border p-2" placeholder="名前" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /><input className="w-full rounded border p-2" type="email" placeholder="メールアドレス" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /><input className="w-full rounded border p-2" type="password" placeholder="パスワード" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6} /><input className="w-full rounded border p-2" placeholder="電話番号" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required /><select className="w-full rounded border p-2" value={form.workplace_id} onChange={e=>setForm({...form,workplace_id:e.target.value})}><option value="">未選択の場合はデフォルト事業所</option>{workplaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button type="submit" disabled={loading} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{loading?'処理中...':'登録してスタッフ画面へ'}</button></form>{message && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{message}</p>}</div>;
}
