'use client';

import type { UserRole } from '@/lib/types';

export function AuthGate({ children }: { allowedRole: UserRole; children: React.ReactNode }) {
  // DEMO MODE: Supabase Auth session checks are bypassed temporarily.
  // Restore the previous getUser()/profiles role verification when authentication is re-enabled.
  return <>{children}</>;
}
