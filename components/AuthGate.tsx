'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/types';

export function AuthGate({ allowedRole, children }: { allowedRole: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Supabaseに接続できません。環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。');
      setState('error');
      return;
    }

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        router.replace(allowedRole === 'staff' ? '/staff/login' : '/admin/login');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profileError || !profile) {
        setMessage('ログインユーザーのprofilesが見つかりません。管理者にprofilesレコード作成を依頼してください。');
        setState('error');
        return;
      }
      if (profile.role !== allowedRole) {
        router.replace(profile.role === 'admin' ? '/admin' : '/staff');
        return;
      }
      setState('ready');
    });
  }, [allowedRole, router]);

  if (state === 'checking') return <div className="rounded bg-white p-6 shadow">認証確認中...</div>;
  if (state === 'error') return <div className="rounded border border-red-200 bg-red-50 p-6 text-red-800">{message}</div>;
  return <>{children}</>;
}
