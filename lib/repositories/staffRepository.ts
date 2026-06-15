import { mockProfiles } from '@/lib/mockData';
import type { Profile } from '@/lib/types';
import { getClient, getCompanyId } from './client';
export async function listProfiles(role?: Profile['role']): Promise<Profile[]> { const s = getClient(); if (!s) return role ? mockProfiles.filter(p=>p.role===role) : mockProfiles; let q = s.from('profiles').select('*').order('created_at'); if (role) q = q.eq('role', role); const { data, error } = await q; if (error) throw error; return (data ?? []) as Profile[]; }
export async function saveStaff(row: Partial<Profile> & Pick<Profile,'name'|'workplace_id'>): Promise<Profile> { const s=getClient(); const payload={ phone:'', staff_role:'staff', role:'staff', ...row, company_id: row.company_id ?? await getCompanyId() }; if(!s) return { id: row.id ?? `demo-staff-${Date.now()}`, created_at:new Date().toISOString(), ...payload } as Profile; const {data,error}=await s.from('profiles').upsert(payload).select('*').single(); if(error) throw error; return data as Profile; }
export async function deleteStaff(id:string){ const s=getClient(); if(!s) return; const {error}=await s.from('profiles').delete().eq('id',id); if(error) throw error; }
