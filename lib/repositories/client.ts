import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import { mockCompany, mockProfiles } from '@/lib/mockData';

export const demoCompanyId = mockCompany.id;
export const demoAdminId = mockProfiles.find((p) => p.role === 'admin')?.id ?? mockProfiles[0]?.id ?? 'admin-1';
export const demoStaffId = mockProfiles.find((p) => p.role === 'staff')?.id ?? 'staff-1';

export function getClient() {
  return getSupabaseBrowserClient();
}

export async function getCompanyId() {
  const s = getClient();
  if (!s) return demoCompanyId;
  const { data } = await s.from('companies').select('id').limit(1).maybeSingle();
  return data?.id ?? demoCompanyId;
}

export async function getDemoStaffId() {
  const s = getClient();
  if (!s) return demoStaffId;
  const { data } = await s.from('profiles').select('id').eq('role', 'staff').order('created_at').limit(1).maybeSingle();
  return data?.id ?? demoStaffId;
}

export { isSupabaseConfigured };
