'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { Select } from '@/components/ui/Select';
import { getProjectFill, getDemoAssignments } from '@/lib/demo';
import { mockAvailabilities, mockCompany, mockProfiles, mockProjects, mockWorkplaces } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Assignment, Availability, Project, Profile, Workplace } from '@/lib/types';

type ProjectState = '未配置' | '配置OK' | '人数不足' | 'リーダー不足';
const STORAGE_KEY = 'omega-demo-projects';

const newProject = (workplaceId: string): Project => ({
  id: `demo-project-${Date.now()}`,
  company_id: mockCompany.id,
  workplace_id: workplaceId,
  title: '新規案件',
  work_date: new Date().toISOString().slice(0, 10),
  start_time: '09:00',
  end_time: '17:00',
  location: '未設定',
  required_people: 1,
  required_leaders: 1,
  note: '',
  created_at: new Date().toISOString(),
});

export default function Page() {
  const [items, setItems] = useState<Project[]>(mockProjects);
  const [workplaces, setWorkplaces] = useState<Workplace[]>(mockWorkplaces);
  const [assignments, setAssignments] = useState<Assignment[]>(getDemoAssignments());
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [q, setQ] = useState('');
  const [wp, setWp] = useState('all');
  const [editing, setEditing] = useState<Project | null>(null);
  const [msg, setMsg] = useState('デモデータで操作できます');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved) as Project[]);
    (async () => {
      const s = getSupabaseBrowserClient();
      if (!s) return;
      const [{ data: ps }, { data: ws }, { data: as }, { data: prs }, { data: avs }] = await Promise.all([
        s.from('projects').select('*').order('work_date'),
        s.from('workplaces').select('*'),
        s.from('assignments').select('*'),
        s.from('profiles').select('*'),
        s.from('availabilities').select('*'),
      ]);
      if (ps?.length) setItems(ps as Project[]);
      if (ws?.length) setWorkplaces(ws as Workplace[]);
      if (as?.length) setAssignments(as as Assignment[]);
      if (prs?.length) setProfiles(prs as Profile[]);
      if (avs?.length) setAvailabilities(avs as Availability[]);
      setMsg('');
    })();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const filtered = useMemo(
    () => items.filter((p) => (wp === 'all' || p.workplace_id === wp) && `${p.title} ${p.location}`.toLowerCase().includes(q.toLowerCase())),
    [items, q, wp],
  );
  const stats = useMemo(() => items.reduce<Record<ProjectState, number>>((acc, p) => {
    acc[getState(p, assignments)] += 1;
    return acc;
  }, { 未配置: 0, 配置OK: 0, 人数不足: 0, リーダー不足: 0 }), [items, assignments]);
  const availableStaff = (p: Project) => availabilities.filter((a) => a.work_date === p.work_date && a.status !== 'unavailable').sort((a, b) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1));

  function createProject() {
    const project = newProject(wp === 'all' ? workplaces[0]?.id ?? 'wp-1' : wp);
    setItems((current) => [project, ...current]);
    setEditing(project);
    setMsg('新規案件を作成しました。内容を編集して保存してください。');
  }

  async function save() {
    if (!editing) return;
    const normalized = { ...editing, required_people: Math.max(1, Number(editing.required_people) || 1), required_leaders: Math.max(0, Number(editing.required_leaders) || 0) };
    setItems((a) => a.map((x) => (x.id === normalized.id ? normalized : x)));
    const s = getSupabaseBrowserClient();
    if (!s) {
      setMsg('Supabase未接続のため画面上のみ保存しました');
      setEditing(null);
      return;
    }
    const { error } = await s.from('projects').upsert(normalized).eq('id', normalized.id);
    setMsg(error ? `${error.message}（画面上のみ更新しました）` : '保存しました');
    setEditing(null);
  }

  function remove() {
    if (!editing || !confirm('この案件を削除しますか？')) return;
    setItems((a) => a.filter((x) => x.id !== editing.id));
    setMsg('デモ上で削除しました');
    setEditing(null);
  }

  return <div>
    <PageHeader title="案件管理" description="一覧で不足を把握し、カードを開いて編集、そのまま自動配置へ進める管理者の管制塔です。" actions={<Button onClick={createProject} className="min-h-12 rounded-2xl">＋ 案件新規作成</Button>} />
    {msg && <p className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{msg}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['未配置', '配置OK', '人数不足', 'リーダー不足'] as ProjectState[]).map((s) => <div key={s} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-400">{s}</p><p className="mt-1 text-3xl font-black text-slate-950">{stats[s]}</p></div>)}</div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><Input placeholder="案件名・場所で検索" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
    <div className="grid gap-4">{filtered.map((p) => <ProjectCard key={p.id} project={p} assignments={assignments} workplaces={workplaces} profiles={profiles} staff={availableStaff(p)} onEdit={() => setEditing(p)} />)}</div>
    <ResponsiveEditor open={!!editing} title={editing?.title ?? ''} subtitle="案件詳細" onClose={() => setEditing(null)}>{editing && <div className="space-y-4">
      <Label text="案件名"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Label>
      <Label text="日付"><Input type="date" value={editing.work_date} onChange={(e) => setEditing({ ...editing, work_date: e.target.value })} /></Label>
      <div className="grid grid-cols-2 gap-3"><Label text="開始時間"><Input type="time" value={editing.start_time} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} /></Label><Label text="終了時間"><Input type="time" value={editing.end_time} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} /></Label></div>
      <Label text="場所"><Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></Label>
      <div className="grid grid-cols-2 gap-3"><Label text="必要人数"><Input type="number" min={1} value={editing.required_people} onChange={(e) => setEditing({ ...editing, required_people: Number(e.target.value) })} /></Label><Label text="必要リーダー人数"><Input type="number" min={0} value={editing.required_leaders ?? 0} onChange={(e) => setEditing({ ...editing, required_leaders: Number(e.target.value) })} /></Label></div>
      <Label text="事業所"><Select value={editing.workplace_id} onChange={(e) => setEditing({ ...editing, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Label>
      <Label text="備考"><textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={editing.note ?? ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></Label>
      <Link className="block" href={`/admin/auto-assign?projectId=${editing.id}`}><Button className="w-full rounded-2xl">この案件を配置する</Button></Link>
      <div className="grid grid-cols-2 gap-3"><Button onClick={save}>保存</Button><Button variant="danger" onClick={remove}>削除</Button></div>
    </div>}</ResponsiveEditor>
  </div>;
}

function getState(project: Project, assignments: Assignment[]): ProjectState { const f = getProjectFill(project, assignments); if (f.assigned === 0) return '未配置'; if (!f.peopleOk) return '人数不足'; if (!f.leadersOk) return 'リーダー不足'; return '配置OK'; }
function stateTone(state: ProjectState) { return state === '配置OK' ? 'green' : state === '人数不足' ? 'orange' : state === 'リーダー不足' ? 'red' : 'slate'; }
function ProjectCard({ project, assignments, workplaces, profiles, staff, onEdit }: { project: Project; assignments: Assignment[]; workplaces: Workplace[]; profiles: Profile[]; staff: Availability[]; onEdit: () => void }) { const f = getProjectFill(project, assignments); const state = getState(project, assignments); return <Card role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }} className="group cursor-pointer border-l-4 border-l-blue-600 p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-200 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">{project.title}</h2><Badge tone={stateTone(state)}>{state}</Badge></div><p className="mt-2 text-sm font-semibold text-slate-600">📅 {project.work_date}　🕘 {project.start_time}-{project.end_time}</p><p className="mt-1 text-sm text-slate-500">📍 {workplaces.find((w) => w.id === project.workplace_id)?.name ?? '事業所'} · {project.location}</p></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]"><Info label="必要人数" value={`${project.required_people}名`} danger={!f.peopleOk} /><Info label="必要L" value={`${f.requiredLeaders}名`} danger={!f.leadersOk} /><Info label="配置状況" value={`${f.assigned}/${project.required_people}`} danger={!f.peopleOk} /><Info label="Leader" value={`${f.leaders}/${f.requiredLeaders}`} danger={!f.leadersOk} /></div></div><div className="mt-4 flex flex-wrap gap-2">{staff.length ? staff.slice(0, 6).map((a) => <Badge key={`${a.staff_id}-${a.work_date}`} tone={a.status === 'available' ? 'green' : 'orange'}>{profiles.find((profile) => profile.id === a.staff_id)?.name ?? a.staff_id} {a.status === 'available' ? '○' : '△ 条件付き'}</Badge>) : <Badge tone="slate">候補なし</Badge>}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Link href="/admin/auto-assign" onClick={(e) => e.stopPropagation()}><Button variant="secondary" className="w-full sm:w-auto">自動配置へ進む</Button></Link><Link href={`/admin/auto-assign?projectId=${project.id}`} onClick={(e) => e.stopPropagation()}><Button className="w-full sm:w-auto">この案件を配置する</Button></Link></div></Card>; }
function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className={`rounded-xl p-3 ${danger ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-slate-50 text-slate-800'}`}><p className="text-xs font-semibold opacity-60">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{text}</span>{children}</label>; }
