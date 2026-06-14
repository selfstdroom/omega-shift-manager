import { getStaffNotifications as localGet, markNotificationRead as localRead } from '@/lib/notifications';
import type { Notification } from '@/lib/types';
import { getClient, getCompanyId } from './client';
export async function listNotifications(staffId:string): Promise<Notification[]> { const s=getClient(); if(!s) return localGet(staffId); const {data,error}=await s.from('notifications').select('*').eq('staff_id',staffId).order('created_at',{ascending:false}); if(error) throw error; return data as Notification[]; }
export async function createNotification(row: Omit<Notification,'id'|'created_at'>): Promise<Notification> { const s=getClient(); const payload={...row, company_id: row.company_id || await getCompanyId()}; if(!s) return {id:`demo-notice-${Date.now()}`, created_at:new Date().toISOString(), ...payload}; const {data,error}=await s.from('notifications').insert(payload).select('*').single(); if(error) throw error; return data as Notification; }
export async function markNotificationRead(id:string){ const s=getClient(); if(!s) return localRead(id); const {error}=await s.from('notifications').update({is_read:true}).eq('id',id); if(error) throw error; }
export async function markAllNotificationsRead(staffId:string){ const s=getClient(); if(!s) return; const {error}=await s.from('notifications').update({is_read:true}).eq('staff_id',staffId); if(error) throw error; }
