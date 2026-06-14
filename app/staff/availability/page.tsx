'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { DEMO_USER } from '@/lib/demo';
import { mockAvailabilities, mockProjects } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Availability, AvailabilityStatus, Project } from '@/lib/types';

const options: { value: AvailabilityStatus; label: string; tone: 'green' | 'orange' | 'slate' }[] = [
  { value: 'available', label: '勤務可能', tone: 'green' },
  { value: 'conditional', label: '条件あり', tone: 'orange' },
  { value: 'unavailable', label: '不可', tone: 'slate' },
];

export default function Page() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [avs, setAvs] = useState<Availability[]>(mockAvailabilities.filter((a) => a.staff_id === DEMO_USER.id));
  const [msg, setMsg] = useState('デモスタッフとして表示しています');

  async function load() {
    const s = getSupabaseBrowserClient();
    if (!s) return;
    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const [{ data: ps, error: projectsError }, { data: as, error: availabilityError }] = await Promise.all([
      s.from('projects').select('*').order('work_date'),
      s.from('availabilities').select('*').eq('staff_id', currentUser.id),
    ]);
    if (projectsError || availabilityError || !ps?.length) {
      setMsg(`${projectsError?.message ?? availabilityError?.message ?? 'Supabaseデータなし'}（デモデータを表示しています）`);
      return;
    }
    setProjects(ps as Project[]);
    setAvs((as ?? []) as Availability[]);
    setMsg(user ? '' : 'デモスタッフとして表示しています');
  }

  useEffect(() => { load(); }, []);

  async function save(project: Project, status: AvailabilityStatus, note = avs.find((a) => a.project_id === project.id)?.note ?? '') {
    const s = getSupabaseBrowserClient();
    const updateLocal = () => setAvs((current) => upsertLocalAvailability(current, project, status, note));
    if (!s) { updateLocal(); setMsg('Supabase未接続のため画面上のみ更新しました'); return; }
    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const { error } = await s.from('availabilities').upsert(
      { company_id: project.company_id, project_id: project.id, staff_id: currentUser.id, status, note },
      { onConflict: 'project_id,staff_id' },
    );
    updateLocal();
    setMsg(error ? `${error.message}（画面上のみ更新しました）` : '保存しました');
  }

  return (
    <div>
      <PageHeader title="予定提出" description="案件ごとに、勤務可能・条件あり・不可をワンタップで登録できます。" />
      {msg && <div className="mb-4"><Badge tone="blue">{msg}</Badge></div>}
      <div className="space-y-4">
        {projects.map((p) => {
          const av = avs.find((a) => a.project_id === p.id);
          const status = av?.status ?? 'unavailable';
          return (
            <Card className="p-5" key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{p.title}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-600">{p.work_date} {p.start_time}-{p.end_time}</p>
                  <p className="text-sm text-slate-500">{p.location}</p>
                </div>
                <Badge tone={options.find((o) => o.value === status)?.tone ?? 'slate'}>{options.find((o) => o.value === status)?.label}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {options.map((o) => <Button key={o.value} variant={status === o.value ? 'primary' : 'secondary'} className="min-h-12 px-2" onClick={() => save(p, o.value)}>{o.label}</Button>)}
              </div>
              <Input className="mt-3" placeholder="メモ（例：午前のみ可）" value={av?.note ?? ''} onChange={(e) => save(p, status, e.target.value)} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function upsertLocalAvailability(current: Availability[], project: Project, status: AvailabilityStatus, note: string) {
  const existing = current.find((a) => a.project_id === project.id && a.staff_id === DEMO_USER.id);
  if (existing) return current.map((a) => (a.id === existing.id ? { ...a, status, note } : a));
  return [...current, { id: `demo-${project.id}`, company_id: project.company_id, project_id: project.id, staff_id: DEMO_USER.id, status, note, created_at: new Date().toISOString() }];
}
