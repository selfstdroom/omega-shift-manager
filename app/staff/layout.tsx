'use client';

import { usePathname } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { LogoutButton } from '@/components/LogoutButton';
import { BottomNav, type BottomNavItem } from '@/components/ui/BottomNav';

const nav: BottomNavItem[] = [
  { href: '/staff', label: 'ホーム', icon: '⌂' },
  { href: '/staff/availability', label: '予定提出', icon: '＋' },
  { href: '/staff/shifts', label: 'シフト', icon: '✓' },
  { href: '/staff/notifications', label: '通知', icon: '🔔' },
  { href: '/staff/calendar', label: 'カレンダー', icon: '□' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/staff/login' || path === '/staff/signup') return <div className="px-4 py-10">{children}</div>;

  return (
    <AuthGate allowedRole="staff">
      <div className="mx-auto min-h-[calc(100vh-57px)] max-w-5xl px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-8">
        <div className="mx-auto max-w-3xl"><div className="mb-4 flex justify-end"><LogoutButton type="staff" /></div>{children}</div>
      </div>
      <BottomNav items={nav} />
    </AuthGate>
  );
}
