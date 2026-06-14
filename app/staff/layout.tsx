'use client';

import { AuthGate } from '@/components/AuthGate';
import { BottomNav, type BottomNavItem } from '@/components/ui/BottomNav';

const nav: BottomNavItem[] = [
  { href: '/staff', label: 'ホーム', icon: '⌂' },
  { href: '/staff/availability', label: '予定提出', icon: '＋' },
  { href: '/staff/shifts', label: 'シフト', icon: '✓' },
  { href: '/staff/calendar', label: 'カレンダー', icon: '□' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate allowedRole="staff">
      <div className="mx-auto min-h-[calc(100vh-57px)] max-w-5xl px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
      <BottomNav items={nav} />
    </AuthGate>
  );
}
