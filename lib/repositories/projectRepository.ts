import { mockProjects } from '@/lib/mockData';
import type { Project } from '@/lib/types';
import { getClient, getCompanyId } from './client';
export async function listProjects(): Promise<Project[]> { const s=getClient(); if(!s) return mockProjects; const {data,error}=await s.from('projects').select('*').order('work_date'); if(error) throw error; return (data?.length?data:mockProjects) as Project[]; }
export async function saveProject(row: Project): Promise<Project> { const s=getClient(); const payload={...row, company_id: row.company_id || await getCompanyId()}; if(!s) return payload; const {data,error}=await s.from('projects').upsert(payload).select('*').single(); if(error) throw error; return data as Project; }
export async function saveProjects(rows: Project[]) { const s=getClient(); if(!s || !rows.length) return rows; const company_id=await getCompanyId(); const {data,error}=await s.from('projects').upsert(rows.map(r=>({...r, company_id:r.company_id||company_id}))).select('*'); if(error) throw error; return data as Project[]; }
export async function deleteProject(id:string){ const s=getClient(); if(!s) return; const {error}=await s.from('projects').delete().eq('id',id); if(error) throw error; }
