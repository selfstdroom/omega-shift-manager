'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
const nav=[['/staff','ホーム','⌂'],['/staff/availability','予定登録','＋'],['/staff/shifts','シフト','✓'],['/staff/calendar','カレンダー','□'],['/staff/settings','設定','⚙']];
export default function StaffLayout({ children }: { children: React.ReactNode }) {const path=usePathname();if(path==='/staff/login')return <div className="px-4 py-10">{children}</div>;return <AuthGate allowedRole="staff"><div className="mx-auto min-h-[calc(100vh-57px)] max-w-5xl px-4 py-5 pb-24 sm:px-6 md:py-8"><div className="mx-auto max-w-3xl">{children}</div></div><nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-safe shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">{nav.map(([href,label,icon])=><Link key={href} href={href} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${path===href?'text-blue-600':'text-slate-500'}`}><span className="text-lg">{icon}</span>{label}</Link>)}</nav></AuthGate>; }
