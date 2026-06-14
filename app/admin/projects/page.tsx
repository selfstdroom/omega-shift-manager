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
type EditorMode = 'create' | 'edit' | 'duplicate';
const STORAGE_KEY = 'omega-demo-projects';

const makeProjectId = () => `demo-project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const timeOptions = Array.from({ length: 30 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
});

const newProject = (workplaceId: string, locations: string[] = []): Project => ({
  id: makeProjectId(),
  company_id: mockCompany.id,
  workplace_id: workplaceId,
  title: '',
  work_date: today(),
  start_time: '09:00',
  end_time: '17:00',
  location: locations[0] ?? '',
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
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [msg, setMsg] = useState('ログインなし・Supabase未接続でもデモデータで作成/編集/削除できます');

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
      setMsg('Supabaseと同期しています。未接続時は画面上のデモ操作として保存されます');
    })();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const locationOptions = useMemo(() => Array.from(new Set(items.map((p) => p.location).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(
    () => items
      .filter((p) => (wp === 'all' || p.workplace_id === wp) && `${p.title} ${p.location} ${p.work_date}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => `${a.work_date}${a.start_time}`.localeCompare(`${b.work_date}${b.start_time}`)),
    [items, q, wp],
  );
  const stats = useMemo(() => items.reduce<Record<ProjectState, number>>((acc, p) => {
    acc[getState(p, assignments)] += 1;
    return acc;
  }, { 未配置: 0, 配置OK: 0, 人数不足: 0, リーダー不足: 0 }), [items, assignments]);
  const availableStaff = (p: Project) => availabilities.filter((a) => a.work_date === p.work_date && a.status !== 'unavailable').sort((a, b) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1));

  function createProject() {
    const project = newProject(wp === 'all' ? workplaces[0]?.id ?? 'wp-1' : wp, locationOptions);
    setEditing(project);
    setEditorMode('create');
    setMsg('案件追加フォームを開きました。必要人数・必要リーダー人数は1名で開始します。');
  }

  function openEdit(project: Project) {
    setEditing(project);
    setEditorMode('edit');
  }

  function duplicateProject(project: Project) {
    setEditing({ ...project, id: makeProjectId(), work_date: today(), created_at: new Date().toISOString() });
    setEditorMode('duplicate');
    setMsg('複製フォームを開きました。日付を変更して保存できます。');
  }

  async function save() {
    if (!editing) return;
    const normalized = { ...editing, required_people: Math.max(1, Number(editing.required_people) || 1), required_leaders: Math.max(1, Number(editing.required_leaders) || 1), title: editing.title.trim() || '無題の案件', location: editing.location.trim() || '未設定' };
    setItems((current) => current.some((x) => x.id === normalized.id) ? current.map((x) => (x.id === normalized.id ? normalized : x)) : [normalized, ...current]);
    const s = getSupabaseBrowserClient();
    if (!s) {
      setMsg('Supabase未接続のため画面上のみ保存しました');
      setEditing(null);
      return;
    }
    const { error } = await s.from('projects').upsert(normalized);
    setMsg(error ? `${error.message}（画面上のみ更新しました）` : '保存しました');
    setEditing(null);
  }

  async function remove() {
    if (!editing || !confirm('この案件を削除しますか？')) return;
    setItems((current) => current.filter((x) => x.id !== editing.id));
    const s = getSupabaseBrowserClient();
    if (s) await s.from('projects').delete().eq('id', editing.id);
    setMsg('案件を削除しました');
    setEditing(null);
  }

  const editorTitle = editorMode === 'create' ? '案件を追加' : editorMode === 'duplicate' ? '案件を複製' : editing?.title ?? '';

  return <div>
    <PageHeader title="案件管理" description="案件を素早く登録し、カードを開いて編集・複製・削除・自動配置まで進めます。" actions={<><Link href="/admin/calendar"><Button variant="secondary" className="min-h-12 rounded-2xl">カレンダーへ</Button></Link><Button onClick={createProject} className="min-h-12 rounded-2xl">＋ 案件を追加</Button></>} />
    {msg && <p className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{msg}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['未配置', '配置OK', '人数不足', 'リーダー不足'] as ProjectState[]).map((s) => <div key={s} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-400">{s}</p><p className="mt-1 text-3xl font-black text-slate-950">{stats[s]}</p></div>)}</div>
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><Input placeholder="案件名・場所・日付で検索" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>

    <Card className="hidden overflow-hidden p-0 lg:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">日付</th><th className="px-4 py-3">案件名</th><th className="px-4 py-3">時間</th><th className="px-4 py-3">場所</th><th className="px-4 py-3">必要</th><th className="px-4 py-3">配置状況</th><th className="px-4 py-3">ステータス</th></tr></thead><tbody>{filtered.map((p) => <ProjectRow key={p.id} project={p} assignments={assignments} workplaces={workplaces} onEdit={() => openEdit(p)} />)}</tbody></table></Card>
    <div className="mt-4 grid gap-4 lg:hidden">{filtered.map((p) => <ProjectCard key={p.id} project={p} assignments={assignments} workplaces={workplaces} profiles={profiles} staff={availableStaff(p)} onEdit={() => openEdit(p)} onDuplicate={() => duplicateProject(p)} />)}</div>
    <div className="mt-4 hidden gap-4 lg:grid">{filtered.map((p) => <ProjectCard key={p.id} project={p} assignments={assignments} workplaces={workplaces} profiles={profiles} staff={availableStaff(p)} onEdit={() => openEdit(p)} onDuplicate={() => duplicateProject(p)} />)}</div>

    <ResponsiveEditor open={!!editing} title={editorTitle} subtitle={editorMode === 'duplicate' ? '日付だけ変更して複製できます' : '案件詳細'} onClose={() => setEditing(null)}>{editing && <ProjectForm project={editing} workplaces={workplaces} locationOptions={locationOptions} onChange={setEditing} onSave={save} onRemove={remove} showRemove={editorMode === 'edit'} />}</ResponsiveEditor>
  </div>;
}

function ProjectForm({ project, workplaces, locationOptions, onChange, onSave, onRemove, showRemove }: { project: Project; workplaces: Workplace[]; locationOptions: string[]; onChange: (project: Project) => void; onSave: () => void; onRemove: () => void; showRemove: boolean }) {
  return <div className="space-y-4">
    <datalist id="project-location-options">{locationOptions.map((location) => <option key={location} value={location} />)}</datalist>
    <Label text="案件名"><Input value={project.title} placeholder="例：倉庫棚卸サポート" onChange={(e) => onChange({ ...project, title: e.target.value })} /></Label>
    <Label text="事業所"><Select value={project.workplace_id} onChange={(e) => onChange({ ...project, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Label>
    <Label text="勤務日"><Input type="date" value={project.work_date} onChange={(e) => onChange({ ...project, work_date: e.target.value })} /></Label>
    <div className="grid grid-cols-2 gap-3"><Label text="開始時間"><TimeSelect value={project.start_time} onChange={(value) => onChange({ ...project, start_time: value })} /></Label><Label text="終了時間"><TimeSelect value={project.end_time} onChange={(value) => onChange({ ...project, end_time: value })} /></Label></div>
    <Label text="勤務場所"><Input list="project-location-options" value={project.location} placeholder="過去の場所候補から選択または入力" onChange={(e) => onChange({ ...project, location: e.target.value })} /></Label>
    <div className="grid grid-cols-2 gap-3"><Label text="必要人数"><Input type="number" min={1} value={project.required_people} onChange={(e) => onChange({ ...project, required_people: Number(e.target.value) })} /></Label><Label text="必要リーダー人数"><Input type="number" min={1} value={project.required_leaders ?? 1} onChange={(e) => onChange({ ...project, required_leaders: Number(e.target.value) })} /></Label></div>
    <Label text="備考（任意）"><textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={project.note ?? ''} onChange={(e) => onChange({ ...project, note: e.target.value })} /></Label>
    <Link className="block" href={`/admin/auto-assign?projectId=${project.id}`}><Button className="w-full rounded-2xl">自動配置へ進む</Button></Link>
    <div className={`grid gap-3 ${showRemove ? 'grid-cols-2' : 'grid-cols-1'}`}><Button onClick={onSave}>保存</Button>{showRemove && <Button variant="danger" onClick={onRemove}>削除</Button>}</div>
  </div>;
}

function TimeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <Select value={value} onChange={(e) => onChange(e.target.value)}>{timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}</Select>; }
function getState(project: Project, assignments: Assignment[]): ProjectState { const f = getProjectFill(project, assignments); if (f.assigned === 0) return '未配置'; if (!f.peopleOk) return '人数不足'; if (!f.leadersOk) return 'リーダー不足'; return '配置OK'; }
function stateTone(state: ProjectState) { return state === '配置OK' ? 'green' : state === '人数不足' ? 'orange' : state === 'リーダー不足' ? 'red' : 'slate'; }
function ProjectRow({ project, assignments, workplaces, onEdit }: { project: Project; assignments: Assignment[]; workplaces: Workplace[]; onEdit: () => void }) { const f = getProjectFill(project, assignments); const state = getState(project, assignments); return <tr role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }} className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50"><td className="px-4 py-3 font-bold text-slate-900">{project.work_date}</td><td className="px-4 py-3"><p className="font-bold text-slate-950">{project.title || '無題の案件'}</p><p className="text-xs text-slate-500">{workplaces.find((w) => w.id === project.workplace_id)?.name ?? '事業所'}</p></td><td className="px-4 py-3 text-slate-700">{project.start_time}-{project.end_time}</td><td className="px-4 py-3 text-slate-700">{project.location}</td><td className="px-4 py-3 text-slate-700">{project.required_people}名 / L{f.requiredLeaders}名</td><td className="px-4 py-3 font-bold text-slate-800">{f.assigned}/{project.required_people}（L {f.leaders}/{f.requiredLeaders}）</td><td className="px-4 py-3"><Badge tone={stateTone(state)}>{state}</Badge></td></tr>; }
function ProjectCard({ project, assignments, workplaces, profiles, staff, onEdit, onDuplicate }: { project: Project; assignments: Assignment[]; workplaces: Workplace[]; profiles: Profile[]; staff: Availability[]; onEdit: () => void; onDuplicate: () => void }) { const f = getProjectFill(project, assignments); const state = getState(project, assignments); return <Card role="button" tabIndex={0} onClick={onEdit} onKeyDown={(e) => { if (e.key === 'Enter') onEdit(); }} className="group cursor-pointer border-l-4 border-l-blue-600 p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-200 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">{project.title || '無題の案件'}</h2><Badge tone={stateTone(state)}>{state}</Badge></div><p className="mt-2 text-sm font-semibold text-slate-600">📅 {project.work_date}　🕘 {project.start_time}-{project.end_time}</p><p className="mt-1 text-sm text-slate-500">📍 {workplaces.find((w) => w.id === project.workplace_id)?.name ?? '事業所'} · {project.location}</p></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]"><Info label="必要人数" value={`${project.required_people}名`} danger={!f.peopleOk} /><Info label="必要L" value={`${f.requiredLeaders}名`} danger={!f.leadersOk} /><Info label="配置状況" value={`${f.assigned}/${project.required_people}`} danger={!f.peopleOk} /><Info label="Leader" value={`${f.leaders}/${f.requiredLeaders}`} danger={!f.leadersOk} /></div></div><div className="mt-4 flex flex-wrap gap-2">{staff.length ? staff.slice(0, 6).map((a) => <Badge key={`${a.staff_id}-${a.work_date}`} tone={a.status === 'available' ? 'green' : 'orange'}>{profiles.find((profile) => profile.id === a.staff_id)?.name ?? a.staff_id} {a.status === 'available' ? '○' : '△ 条件付き'}</Badge>) : <Badge tone="slate">候補なし</Badge>}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button variant="secondary" className="w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>複製</Button><Link href={`/admin/auto-assign?projectId=${project.id}`} onClick={(e) => e.stopPropagation()}><Button className="w-full sm:w-auto">自動配置へ進む</Button></Link></div></Card>; }
function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className={`rounded-xl p-3 ${danger ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-slate-50 text-slate-800'}`}><p className="text-xs font-semibold opacity-60">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{text}</span>{children}</label>; }
