import { mockProjectTemplates } from '@/lib/mockData';
import type { ProjectTemplate } from '@/lib/types';
import { getClient, getCompanyId } from './client';
export async function listTemplates(): Promise<ProjectTemplate[]> { const s=getClient(); if(!s) return mockProjectTemplates; const {data,error}=await s.from('project_templates').select('*').order('created_at'); if(error) throw error; return (data?.length?data:mockProjectTemplates) as ProjectTemplate[]; }
export async function saveTemplate(row: ProjectTemplate): Promise<ProjectTemplate> { const s=getClient(); const payload={...row, company_id: row.company_id || await getCompanyId()}; if(!s) return payload; const {data,error}=await s.from('project_templates').upsert(payload).select('*').single(); if(error) throw error; return data as ProjectTemplate; }
export async function deleteTemplate(id:string){ const s=getClient(); if(!s) return; const {error}=await s.from('project_templates').delete().eq('id',id); if(error) throw error; }
