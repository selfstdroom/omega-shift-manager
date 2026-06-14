'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';

export function AuthGate({ allowedRole, children }: { allowedRole: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (allowedRole !== 'staff') { setReady(true); return; }
    const supabase = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !supabase) { setMessage('Supabaseに接続できません。.env.local を設定してください。'); return; }
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) { router.replace('/staff/login'); return; }
      setReady(true);
    });
  }, [allowedRole, router]);

  if (message) return <div className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div>;
  if (!ready) return <div className="rounded-xl bg-white p-4 text-slate-600 shadow">認証状態を確認しています...</div>;
  return <>{children}</>;
}
