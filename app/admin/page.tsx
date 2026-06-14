'use client';
import { useEffect, useMemo, useState } from 'react';
import { NavCard } from '@/components/NavCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { getDemoAssignments, getProjectFill } from '@/lib/demo';
import { mockProfiles, mockProjects } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Assignment, Profile, Project } from '@/lib/types';

export default function AdminDashboard(){
  const [projects,setProjects]=useState<Project[]>(mockProjects); const [profiles,setProfiles]=useState<Profile[]>(mockProfiles); const [assignments,setAssignments]=useState<Assignment[]>(getDemoAssignments()); const [msg,setMsg]=useState('仮データ表示中（Supabase未設定でも確認できます）');
  useEffect(()=>{(async()=>{const s=getSupabaseBrowserClient(); if(!s) return; const [{data:ps},{data:prs},{data:as}]=await Promise.all([s.from('projects').select('*'),s.from('profiles').select('*'),s.from('assignments').select('*')]); if(ps?.length) {setProjects(ps as Project[]); setMsg('Supabase実データ表示中');} if(prs?.length)setProfiles(prs as Profile[]); if(as?.length)setAssignments(as as Assignment[]);})()},[]);
  const today=new Date().toISOString().slice(0,10); const weekEnd=new Date(); weekEnd.setDate(weekEnd.getDate()+7); const weekEndStr=weekEnd.toISOString().slice(0,10);
  const stats=useMemo(()=>{const staff=profiles.filter(p=>p.role==='staff'); return {today:projects.filter(p=>p.work_date===today).length, week:projects.filter(p=>p.work_date>=today&&p.work_date<=weekEndStr).length, staff:staff.length, leaders:staff.filter(p=>p.staff_role==='leader').length, shortPeople:projects.filter(p=>!getProjectFill(p,assignments).peopleOk).length, shortLeaders:projects.filter(p=>!getProjectFill(p,assignments).leadersOk).length};},[projects,profiles,assignments,today,weekEndStr]);
  return <div><PageHeader title="管理者ダッシュボード" description="デモ管理者として案件・スタッフ・不足状況を俯瞰できます。" /><div className="mb-5"><Badge tone="blue">{msg}</Badge></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><StatCard label="今日の案件数" value={stats.today} helper={today}/><StatCard label="今週の案件数" value={stats.week}/><StatCard label="スタッフ数" value={stats.staff} tone="slate"/><StatCard label="リーダー数" value={stats.leaders} tone="green"/><StatCard label="人数不足案件数" value={stats.shortPeople} tone="orange"/><StatCard label="リーダー不足案件数" value={stats.shortLeaders} tone="red"/></div><SectionCard className="mt-8" title="クイック操作" description="確認したい業務フローへすぐ移動できます。"><div className="grid gap-4 md:grid-cols-2"><NavCard href="/admin/projects" title="案件管理" description="日付・場所・必要人数・充足状況を確認"/><NavCard href="/admin/auto-assign" title="自動配置" description="配置結果と不足案件を確認"/><NavCard href="/admin/staff" title="スタッフ管理" description="スタッフ/リーダーを確認"/><NavCard href="/admin/workplaces" title="事業所管理" description="拠点情報を確認"/></div></SectionCard></div>;
}
