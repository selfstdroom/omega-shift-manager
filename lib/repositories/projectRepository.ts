import { mockProjectDays, mockProjects } from '@/lib/mockData';
import type { Project, ProjectDay } from '@/lib/types';
import { getClient, getCompanyId } from './client';

export async function listProjects(): Promise<Project[]> { const s=getClient(); if(!s) return mockProjects; const {data,error}=await s.from('projects').select('*').order('work_date'); if(error) throw error; return (data?.length?data:mockProjects) as Project[]; }
export async function listProjectDays(): Promise<ProjectDay[]> { const s=getClient(); if(!s) return mockProjectDays; const {data,error}=await s.from('project_days').select('*').order('work_date'); if(error) throw error; return (data?.length?data:mockProjectDays) as ProjectDay[]; }
export async function saveProject(row: Project): Promise<Project> { const s=getClient(); const payload={...row, company_id: row.company_id || await getCompanyId()}; if(!s) return payload; const {data,error}=await s.from('projects').upsert(payload).select('*').single(); if(error) throw error; return data as Project; }
export async function saveProjectDay(row: ProjectDay): Promise<ProjectDay> { const s=getClient(); if(!s) return row; const {data,error}=await s.from('project_days').upsert(row).select('*').single(); if(error) throw error; return data as ProjectDay; }
export async function saveProjectDays(rows: ProjectDay[]) { const s=getClient(); if(!s || !rows.length) return rows; const {data,error}=await s.from('project_days').upsert(rows).select('*'); if(error) throw error; return data as ProjectDay[]; }
export async function saveProjects(rows: Project[]) { const s=getClient(); if(!s || !rows.length) return rows; const company_id=await getCompanyId(); const {data,error}=await s.from('projects').upsert(rows.map(r=>({...r, company_id:r.company_id||company_id}))).select('*'); if(error) throw error; return data as Project[]; }
export async function deleteProject(id:string){ const s=getClient(); if(!s) return; const {error}=await s.from('projects').delete().eq('id',id); if(error) throw error; }
export async function deleteProjectDay(id:string){ const s=getClient(); if(!s) return; const {error}=await s.from('project_days').delete().eq('id',id); if(error) throw error; }
