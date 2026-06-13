'use client';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
export function LogoutButton(){const router=useRouter();return <button className="text-sm text-red-700" onClick={async()=>{await getSupabaseBrowserClient()?.auth.signOut(); router.replace('/login');}}>ログアウト</button>}
