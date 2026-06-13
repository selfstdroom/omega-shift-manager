import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: 'Omega Shift Manager', description: 'オメガテクノ向けシフト管理MVP' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/" className="text-lg font-bold">Omega Shift Manager</Link><nav className="flex gap-4 text-sm"><Link href="/admin">管理者</Link><Link href="/staff">スタッフ</Link><Link href="/login">ログイン</Link></nav></div></header><main className="mx-auto max-w-6xl px-6 py-8">{children}</main></body></html>;
}
