import { mockWorkplaces } from '@/lib/mockData';
import type { Workplace } from '@/lib/types';
import { getClient, getCompanyId } from './client';

export async function listWorkplaces(): Promise<Workplace[]> { const s = getClient(); if (!s) return mockWorkplaces; const { data, error } = await s.from('workplaces').select('*').order('created_at'); if (error) throw error; return (data?.length ? data : mockWorkplaces) as Workplace[]; }
export async function saveWorkplace(row: Partial<Workplace> & Pick<Workplace, 'name'>): Promise<Workplace> { const s = getClient(); const payload = { ...row, company_id: row.company_id ?? await getCompanyId() }; if (!s) return { id: row.id ?? `demo-workplace-${Date.now()}`, address: '', created_at: new Date().toISOString(), ...payload } as Workplace; const { data, error } = await s.from('workplaces').upsert(payload).select('*').single(); if (error) throw error; return data as Workplace; }
export async function deleteWorkplace(id: string) { const s = getClient(); if (!s) return; const { error } = await s.from('workplaces').delete().eq('id', id); if (error) throw error; }
