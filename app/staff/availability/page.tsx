'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { DEMO_USER } from '@/lib/demo';
import { mockAvailabilities, mockProjects } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Availability, AvailabilityStatus, Project } from '@/lib/types';

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [avs, setAvs] = useState<Availability[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const s = getSupabaseBrowserClient();
    if (!s) {
      setProjects(mockProjects);
      setAvs(mockAvailabilities.filter((a) => a.staff_id === DEMO_USER.id));
      setMsg('Supabase未接続のためデモデータを表示しています');
      return;
    }

    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const [{ data: ps, error: projectsError }, { data: as, error: availabilityError }] = await Promise.all([
      s.from('projects').select('*').order('work_date'),
      s.from('availabilities').select('*').eq('staff_id', currentUser.id),
    ]);

    if (projectsError || availabilityError) {
      setProjects(mockProjects);
      setAvs(mockAvailabilities.filter((a) => a.staff_id === DEMO_USER.id));
      setMsg(projectsError?.message ?? availabilityError?.message ?? 'デモデータを表示しています');
      return;
    }

    setProjects(ps ?? []);
    setAvs(as ?? []);
    setMsg(user ? '' : 'デモスタッフとして表示しています');
  }

  useEffect(() => { load(); }, []);

  async function save(project: Project, status: AvailabilityStatus) {
    const s = getSupabaseBrowserClient();
    if (!s) {
      setAvs((current) => upsertLocalAvailability(current, project, status));
      setMsg('Supabase未接続のため画面上のみ更新しました');
      return;
    }

    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const { error } = await s.from('availabilities').upsert(
      { company_id: project.company_id, project_id: project.id, staff_id: currentUser.id, status },
      { onConflict: 'project_id,staff_id' },
    );

    if (error) {
      setAvs((current) => upsertLocalAvailability(current, project, status));
      setMsg(`${error.message}（画面上のみ更新しました）`);
    } else {
      setMsg('保存しました');
      load();
    }
  }

  return <div><PageHeader title="予定登録" description="タップしやすいカードで勤務可否を登録します。" />{msg && <p className="mb-3 text-red-700">{msg}</p>}<div className="space-y-3">{projects.map((p) => { const av = avs.find((a) => a.project_id === p.id); return <Card className="p-4" key={p.id}><b>{p.title}</b><p className="mt-1 text-sm text-slate-600">{p.work_date} {p.start_time}-{p.end_time}</p><Select className="mt-3" value={av?.status ?? 'unavailable'} onChange={(e) => save(p, e.target.value as AvailabilityStatus)}><option value="available">勤務可能</option><option value="conditional">条件あり</option><option value="unavailable">不可</option></Select></Card>; })}</div></div>;
}

function upsertLocalAvailability(current: Availability[], project: Project, status: AvailabilityStatus) {
  const existing = current.find((a) => a.project_id === project.id && a.staff_id === DEMO_USER.id);
  if (existing) {
    return current.map((a) => (a.id === existing.id ? { ...a, status } : a));
  }

  return [...current, {
    id: `demo-${project.id}`,
    company_id: project.company_id,
    project_id: project.id,
    staff_id: DEMO_USER.id,
    status,
    note: '',
    created_at: new Date().toISOString(),
  }];
}
