'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export function LogoutButton({ type }: { type: 'admin' | 'staff' }) {
  const router = useRouter();
  async function logout() {
    if (type === 'staff') { await getSupabaseBrowserClient()?.auth.signOut(); document.cookie = 'omega_staff_session=; path=/; max-age=0; SameSite=Lax'; }
    await fetch(`/api/${type}/logout`, { method: 'POST' });
    router.replace(type === 'admin' ? '/admin/login' : '/staff/login');
    router.refresh();
  }
  return <button onClick={logout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">ログアウト</button>;
}
