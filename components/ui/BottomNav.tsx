'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type BottomNavItem = { href: string; label: string; icon: string };

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/95 pb-safe shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const active = path === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${active ? 'text-blue-600' : 'text-slate-500'}`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-2xl text-base ${active ? 'bg-blue-50' : ''}`}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
