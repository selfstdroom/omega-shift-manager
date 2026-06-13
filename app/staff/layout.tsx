'use client';
import { AuthGate } from '@/components/AuthGate';
export default function StaffLayout({ children }: { children: React.ReactNode }) { return <AuthGate allowedRole="staff">{children}</AuthGate>; }
