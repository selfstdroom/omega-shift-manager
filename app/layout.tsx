import type { Metadata } from 'next';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import './globals.css';

export const metadata: Metadata = { title: 'Omega Shift Manager', description: 'オメガテクノ向けシフト管理' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6"><Link href="/" className="text-base font-bold tracking-tight text-slate-950">Omega Shift</Link><nav className="flex items-center gap-3 text-sm text-slate-600"><Link className="hidden hover:text-slate-950 sm:inline" href="/admin">管理者</Link><Link className="hidden hover:text-slate-950 sm:inline" href="/staff">スタッフ</Link><Link className="hover:text-slate-950" href="/login">ログイン</Link><LogoutButton /></nav></div></header><main>{children}</main></body></html>;
}
