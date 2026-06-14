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
import { mockAvailabilities, mockCompany, mockProfiles, mockProjectDays, mockProjectTemplates, mockProjects, mockWorkplaces } from '@/lib/mockData';
import { listAvailabilities } from '@/lib/repositories/availabilityRepository';
import { listAssignments } from '@/lib/repositories/assignmentRepository';
import { deleteProject, deleteProjectDay, listProjectDays, listProjects, saveProject, saveProjectDay, saveProjectDays, saveProjects } from '@/lib/repositories/projectRepository';
import { listProfiles } from '@/lib/repositories/staffRepository';
import { listTemplates } from '@/lib/repositories/templateRepository';
import { listWorkplaces } from '@/lib/repositories/workplaceRepository';
import type { Assignment, Availability, Project, ProjectDay, Profile, ProjectTemplate, Workplace } from '@/lib/types';

type ProjectState = '未配置' | '配置OK' | '人数不足' | 'リーダー不足';
type EditorMode = 'create' | 'edit' | 'duplicate';
const STORAGE_KEY = 'omega-demo-projects';
const TEMPLATE_STORAGE_KEY = 'omega-demo-project-templates';
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

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
  project_type: 'single',
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
  const [projectDays, setProjectDays] = useState<ProjectDay[]>(mockProjectDays);
  const [tab, setTab] = useState<'single' | 'recurring'>('single');
  const [workplaces, setWorkplaces] = useState<Workplace[]>(mockWorkplaces);
  const [assignments, setAssignments] = useState<Assignment[]>(getDemoAssignments());
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [q, setQ] = useState('');
  const [wp, setWp] = useState('all');
  const [editing, setEditing] = useState<Project | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [templates, setTemplates] = useState<ProjectTemplate[]>(mockProjectTemplates);
  const [templateCreatorOpen, setTemplateCreatorOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>({ templateId: mockProjectTemplates[0]?.id ?? '', mode: 'single', date: today(), weekStart: today(), month: today().slice(0, 7), weekdays: mockProjectTemplates[0]?.weekdays ?? [1, 3, 5] });
  const [msg, setMsg] = useState('ログインなし・Supabase未接続でもデモデータで作成/編集/削除できます');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved) as Project[]);
    const savedTemplates = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates) as ProjectTemplate[]);
    Promise.all([listProjects(), listProjectDays(), listWorkplaces(), listAssignments(), listProfiles(), listAvailabilities(), listTemplates()]).then(([ps, pds, ws, as, prs, avs, pts]) => {
      setItems(ps); setProjectDays(pds); setWorkplaces(ws); setAssignments(as); setProfiles(prs); setAvailabilities(avs); setTemplates(pts); setMsg('Supabase接続時は実データ、未接続時はデモデータで操作できます');
    }).catch((error) => setMsg(`${(error as Error).message}（デモデータを表示中）`));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.localStorage.setItem('omega-demo-project-days', JSON.stringify(projectDays));
  }, [items, projectDays]);

  const selectedTemplate = templates.find((template) => template.id === templateDraft.templateId) ?? templates[0];

  const locationOptions = useMemo(() => Array.from(new Set(items.map((p) => p.location).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(
    () => items
      .filter((p) => p.project_type === tab)
      .filter((p) => (wp === 'all' || p.workplace_id === wp) && `${p.title} ${p.location} ${p.work_date}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => `${a.work_date}${a.start_time}`.localeCompare(`${b.work_date}${b.start_time}`)),
    [items, q, tab, wp],
  );
  const stats = useMemo(() => items.reduce<Record<ProjectState, number>>((acc, p) => {
    if (p.project_type === 'single') acc[getState(p, assignments)] += 1;
    return acc;
  }, { 未配置: 0, 配置OK: 0, 人数不足: 0, リーダー不足: 0 }), [items, assignments]);
  const availableStaff = (p: Project | ProjectDay) => availabilities.filter((a) => a.work_date === p.work_date && a.status !== 'unavailable').sort((a, b) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1));

  function openTemplateCreator() {
    const template = selectedTemplate;
    setTemplateDraft((current) => ({ ...current, templateId: template?.id ?? '', weekdays: template?.weekdays ?? current.weekdays }));
    setTemplateCreatorOpen(true);
  }

  async function createFromTemplate() {
    if (!selectedTemplate) return;
    const dates = datesForDraft(templateDraft, selectedTemplate);
    const projects = dates.map((workDate) => projectFromTemplate(selectedTemplate, workDate));
    setItems((current) => [...projects, ...current]);
    try { await saveProjects(projects); setMsg(`${projects.length}件の案件をテンプレートから作成しました`); } catch (error) { setMsg(`${(error as Error).message}（${projects.length}件を画面上のみ作成しました）`); }
    setTemplateCreatorOpen(false);
  }

  function createProject() {
    const project = newProject(wp === 'all' ? workplaces[0]?.id ?? 'wp-1' : wp, locationOptions);
    setEditing(project);
    setEditorMode('create');
    setMsg('単発案件追加フォームを開きました。必要人数・必要リーダー人数は1名で開始します。');
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
    const day: ProjectDay = { id: normalized.id, project_id: normalized.id, work_date: normalized.work_date, start_time: normalized.start_time, end_time: normalized.end_time, required_people: normalized.required_people, required_leaders: normalized.required_leaders, note: normalized.note, created_at: normalized.created_at };
    setItems((current) => current.some((x) => x.id === normalized.id) ? current.map((x) => (x.id === normalized.id ? normalized : x)) : [normalized, ...current]);
    if (normalized.project_type === 'single') setProjectDays((current) => current.some((x) => x.id === day.id) ? current.map((x) => (x.id === day.id ? day : x)) : [day, ...current]);
    try { await saveProject(normalized); if (normalized.project_type === 'single') await saveProjectDay(day); setMsg('保存しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ更新しました）`); }
    setEditing(null);
  }

  async function remove() {
    if (!editing || !confirm('この案件を削除しますか？')) return;
    setItems((current) => current.filter((x) => x.id !== editing.id));
    try { await deleteProject(editing.id); setMsg('案件を削除しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ削除しました）`); }
    setEditing(null);
  }

  const editorTitle = editorMode === 'create' ? '案件を追加' : editorMode === 'duplicate' ? '案件を複製' : editing?.title ?? '';

  return <div>
    <PageHeader title="案件管理" description="案件を素早く登録し、カードを開いて編集・複製・削除・自動配置まで進めます。" actions={<><Link href="/admin/templates"><Button variant="secondary" className="min-h-12 rounded-2xl">テンプレート管理</Button></Link><Button variant="secondary" onClick={openTemplateCreator} className="min-h-12 rounded-2xl">テンプレートから作成</Button><Link href="/admin/calendar"><Button variant="secondary" className="min-h-12 rounded-2xl">カレンダーへ</Button></Link><Button onClick={createProject} className="min-h-12 rounded-2xl">＋ 単発案件を追加</Button></>} />
    {msg && <p className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{msg}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['未配置', '配置OK', '人数不足', 'リーダー不足'] as ProjectState[]).map((s) => <div key={s} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-400">{s}</p><p className="mt-1 text-3xl font-black text-slate-950">{stats[s]}</p></div>)}</div>
    <div className="mb-4 flex gap-2"><Button variant={tab === 'single' ? 'primary' : 'secondary'} onClick={() => setTab('single')}>単発案件</Button><Button variant={tab === 'recurring' ? 'primary' : 'secondary'} onClick={() => setTab('recurring')}>継続案件</Button></div><div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><Input placeholder="案件名・場所・日付で検索" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>

    {tab === 'single' && <Card className="hidden overflow-hidden p-0 lg:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">日付</th><th className="px-4 py-3">案件名</th><th className="px-4 py-3">時間</th><th className="px-4 py-3">場所</th><th className="px-4 py-3">必要</th><th className="px-4 py-3">配置状況</th><th className="px-4 py-3">ステータス</th></tr></thead><tbody>{filtered.map((p) => <ProjectRow key={p.id} project={p} assignments={assignments} workplaces={workplaces} onEdit={() => openEdit(p)} />)}</tbody></table></Card>}
    {tab === 'recurring' && <RecurringProjectList projects={filtered} projectDays={projectDays} assignments={assignments} workplaces={workplaces} profiles={profiles} availabilities={availabilities} setProjectDays={setProjectDays} setProjects={setItems} setMsg={setMsg} />}
    {tab === 'single' && <div className="mt-4 grid gap-4 lg:hidden">{filtered.map((p) => <ProjectCard key={p.id} project={p} assignments={assignments} workplaces={workplaces} profiles={profiles} staff={availableStaff(p)} onEdit={() => openEdit(p)} onDuplicate={() => duplicateProject(p)} />)}</div>}
    {tab === 'single' && <div className="mt-4 hidden gap-4 lg:grid">{filtered.map((p) => <ProjectCard key={p.id} project={p} assignments={assignments} workplaces={workplaces} profiles={profiles} staff={availableStaff(p)} onEdit={() => openEdit(p)} onDuplicate={() => duplicateProject(p)} />)}</div>}

    <ResponsiveEditor open={templateCreatorOpen} title="テンプレートから作成" subtitle="1日・指定週・指定月に曜日指定で複製します" onClose={() => setTemplateCreatorOpen(false)}><TemplateCreator templates={templates} draft={templateDraft} onChange={setTemplateDraft} onCreate={createFromTemplate} /></ResponsiveEditor>
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


function RecurringProjectList({ projects, projectDays, assignments, workplaces, profiles, availabilities, setProjectDays, setProjects, setMsg }: { projects: Project[]; projectDays: ProjectDay[]; assignments: Assignment[]; workplaces: Workplace[]; profiles: Profile[]; availabilities: Availability[]; setProjectDays: React.Dispatch<React.SetStateAction<ProjectDay[]>>; setProjects: React.Dispatch<React.SetStateAction<Project[]>>; setMsg: (message: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(projects[0]?.id ?? null);
  const [weekdayDraft, setWeekdayDraft] = useState({ start: today(), end: today(), weekdays: [1, 3, 5] });
  const daysOf = (projectId: string) => projectDays.filter((day) => day.project_id === projectId).sort((a, b) => `${a.work_date}${a.start_time}`.localeCompare(`${b.work_date}${b.start_time}`));
  const updateProject = async (project: Project) => { setProjects((current) => current.map((item) => item.id === project.id ? project : item)); try { await saveProject(project); setMsg('継続案件を保存しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ更新しました）`); } };
  const updateDay = async (day: ProjectDay) => { const normalized = { ...day, required_people: Math.max(1, Number(day.required_people) || 1), required_leaders: Math.max(1, Number(day.required_leaders) || 1) }; setProjectDays((current) => current.map((item) => item.id === day.id ? normalized : item)); try { await saveProjectDay(normalized); setMsg('案件日を保存しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ更新しました）`); } };
  const addDay = async (project: Project, date = today()) => { const day: ProjectDay = { id: `demo-day-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, project_id: project.id, work_date: date, start_time: project.start_time, end_time: project.end_time, required_people: project.required_people, required_leaders: project.required_leaders ?? 1, note: '', created_at: new Date().toISOString() }; setProjectDays((current) => [...current, day]); try { await saveProjectDay(day); setMsg('案件日を追加しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ追加しました）`); } };
  const removeDay = async (dayId: string) => { setProjectDays((current) => current.filter((day) => day.id !== dayId)); try { await deleteProjectDay(dayId); setMsg('案件日を削除しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ削除しました）`); } };
  const addWeekdays = async (project: Project) => { const start = new Date(`${weekdayDraft.start}T00:00:00`); const end = new Date(`${weekdayDraft.end}T00:00:00`); const days: ProjectDay[] = []; for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) { if (!weekdayDraft.weekdays.includes(cursor.getDay())) continue; days.push({ id: `demo-day-${Date.now()}-${cursor.getTime()}`, project_id: project.id, work_date: cursor.toISOString().slice(0, 10), start_time: project.start_time, end_time: project.end_time, required_people: project.required_people, required_leaders: project.required_leaders ?? 1, note: '', created_at: new Date().toISOString() }); } setProjectDays((current) => [...current, ...days]); try { await saveProjectDays(days); setMsg(`${days.length}件の案件日を追加しました`); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ追加しました）`); } };
  return <div className="space-y-4">{projects.map((project) => { const days = daysOf(project.id); const fills = days.map((day) => getProjectFill({ ...day, company_id: project.company_id, workplace_id: project.workplace_id, title: project.title, location: project.location, project_type: project.project_type }, assignments)); const unassigned = fills.filter((fill) => fill.assigned === 0).length; const peopleShort = fills.filter((fill) => !fill.peopleOk).length; const leaderShort = fills.filter((fill) => !fill.leadersOk).length; const confirmed = days.filter((day) => assignments.filter((a) => a.project_id === day.id).length > 0 && assignments.filter((a) => a.project_id === day.id).every((a) => a.status === 'confirmed')).length; const period = days.length ? `${days[0].work_date}〜${days[days.length - 1].work_date}` : '日付未設定'; return <Card key={project.id} className="border-l-4 border-l-purple-600 p-5"><button type="button" className="w-full text-left" onClick={() => setExpanded(expanded === project.id ? null : project.id)}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{project.title || '無題の継続案件'}</h2><Badge tone="blue">継続案件</Badge></div><p className="mt-2 text-sm font-semibold text-slate-600">📍 {workplaces.find((w) => w.id === project.workplace_id)?.name ?? '事業所'} · {project.location}</p><p className="mt-1 text-sm text-slate-500">期間: {period}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5"><Info label="総勤務日数" value={`${days.length}日`} /><Info label="未配置日数" value={`${unassigned}日`} danger={unassigned > 0} /><Info label="人数不足日数" value={`${peopleShort}日`} danger={peopleShort > 0} /><Info label="L不足日数" value={`${leaderShort}日`} danger={leaderShort > 0} /><Info label="確定済み" value={`${confirmed}日`} /></div></div></button>{expanded === project.id && <div className="mt-5 space-y-5 border-t border-slate-100 pt-5"><div className="grid gap-3 md:grid-cols-2"><Label text="案件名"><Input value={project.title} onChange={(e) => updateProject({ ...project, title: e.target.value })} /></Label><Label text="場所"><Input value={project.location} onChange={(e) => updateProject({ ...project, location: e.target.value })} /></Label><Label text="期間開始"><Input type="date" value={days[0]?.work_date ?? project.work_date} onChange={(e) => updateProject({ ...project, work_date: e.target.value })} /></Label><Label text="備考"><Input value={project.note ?? ''} onChange={(e) => updateProject({ ...project, note: e.target.value })} /></Label></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => addDay(project)}>日付を追加</Button><Link href={`/admin/auto-assign?projectId=${project.id}`}><Button>この継続案件の勤務日を自動配置</Button></Link></div><div className="rounded-2xl bg-slate-50 p-4"><p className="mb-3 text-sm font-black text-slate-600">曜日指定で複数日追加</p><div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"><Input type="date" value={weekdayDraft.start} onChange={(e) => setWeekdayDraft({ ...weekdayDraft, start: e.target.value })} /><Input type="date" value={weekdayDraft.end} onChange={(e) => setWeekdayDraft({ ...weekdayDraft, end: e.target.value })} /><div className="grid grid-cols-7 gap-1">{weekdays.map((day, index) => <button key={day} type="button" onClick={() => setWeekdayDraft({ ...weekdayDraft, weekdays: weekdayDraft.weekdays.includes(index) ? weekdayDraft.weekdays.filter((v) => v !== index) : [...weekdayDraft.weekdays, index].sort() })} className={`rounded-lg py-2 text-xs font-bold ${weekdayDraft.weekdays.includes(index) ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>{day}</button>)}</div><Button onClick={() => addWeekdays(project)}>追加</Button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs font-bold text-slate-400"><tr><th className="p-2">日付</th><th className="p-2">時間</th><th className="p-2">必要人数</th><th className="p-2">必要L</th><th className="p-2">配置済み</th><th className="p-2">L配置</th><th className="p-2">状態</th><th className="p-2">操作</th></tr></thead><tbody>{days.map((day) => { const workDay = { ...day, company_id: project.company_id, workplace_id: project.workplace_id, title: project.title, location: project.location, project_type: project.project_type }; const fill = getProjectFill(workDay, assignments); const state = fill.assigned === 0 ? '未配置' : !fill.peopleOk ? '人数不足' : !fill.leadersOk ? 'リーダー不足' : '配置OK'; return <tr key={day.id} className="border-t border-slate-100"><td className="p-2"><Input type="date" value={day.work_date} onChange={(e) => updateDay({ ...day, work_date: e.target.value })} /></td><td className="p-2"><div className="grid grid-cols-2 gap-2"><TimeSelect value={day.start_time} onChange={(value) => updateDay({ ...day, start_time: value })} /><TimeSelect value={day.end_time} onChange={(value) => updateDay({ ...day, end_time: value })} /></div></td><td className="p-2"><Input type="number" min={1} value={day.required_people} onChange={(e) => updateDay({ ...day, required_people: Number(e.target.value) })} /></td><td className="p-2"><Input type="number" min={0} value={day.required_leaders ?? 1} onChange={(e) => updateDay({ ...day, required_leaders: Number(e.target.value) })} /></td><td className="p-2 font-bold">{fill.assigned}/{day.required_people}</td><td className="p-2 font-bold">{fill.leaders}/{fill.requiredLeaders}</td><td className="p-2"><Badge tone={stateTone(state as ProjectState)}>{state}</Badge></td><td className="p-2"><div className="flex gap-2"><Link href={`/admin/auto-assign?projectId=${day.id}`}><Button variant="secondary">この日だけ自動配置</Button></Link><Button variant="danger" onClick={() => removeDay(day.id)}>削除</Button></div></td></tr>; })}</tbody></table></div></div>}</Card>; })}</div>;
}

type TemplateDraft = { templateId: string; mode: 'single' | 'week' | 'month'; date: string; weekStart: string; month: string; weekdays: number[] };
function projectFromTemplate(template: ProjectTemplate, workDate: string): Project { return { id: makeProjectId(), project_type: 'single', company_id: template.company_id, workplace_id: template.workplace_id, title: template.title, work_date: workDate, start_time: template.start_time, end_time: template.end_time, location: template.location, required_people: template.required_people, required_leaders: template.required_leaders ?? 0, note: template.note, created_at: new Date().toISOString() }; }
function datesForDraft(draft: TemplateDraft, template: ProjectTemplate) { const selected = draft.weekdays.length ? draft.weekdays : template.weekdays; if (draft.mode === 'single') return [draft.date]; const dates: string[] = []; if (draft.mode === 'week') { const base = new Date(`${draft.weekStart}T00:00:00`); for (let offset = 0; offset < 7; offset += 1) { const d = new Date(base); d.setDate(base.getDate() + offset); if (selected.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10)); } return dates; } const [year, month] = draft.month.split('-').map(Number); const last = new Date(year, month, 0).getDate(); for (let day = 1; day <= last; day += 1) { const d = new Date(year, month - 1, day); if (selected.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10)); } return dates; }
function TemplateCreator({ templates, draft, onChange, onCreate }: { templates: ProjectTemplate[]; draft: TemplateDraft; onChange: (draft: TemplateDraft) => void; onCreate: () => void }) { const template = templates.find((t) => t.id === draft.templateId) ?? templates[0]; const preview = template ? datesForDraft(draft, template) : []; return <div className="space-y-4"><Label text="テンプレート選択"><Select value={draft.templateId} onChange={(e) => { const next = templates.find((t) => t.id === e.target.value); onChange({ ...draft, templateId: e.target.value, weekdays: next?.weekdays ?? draft.weekdays }); }}>{templates.map((t) => <option key={t.id} value={t.id}>{t.template_name}（{t.title}）</option>)}</Select></Label>{template && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-bold text-slate-950">{template.title}</p><p className="mt-1">{template.start_time}-{template.end_time} · {template.location} · {template.required_people}名 / L{template.required_leaders ?? 0}名</p></div>}<Label text="作成単位"><Select value={draft.mode} onChange={(e) => onChange({ ...draft, mode: e.target.value as TemplateDraft['mode'] })}><option value="single">1日だけ作成</option><option value="week">指定週に複数日作成</option><option value="month">指定月に複数日作成</option></Select></Label>{draft.mode === 'single' ? <Label text="日付"><Input type="date" value={draft.date} onChange={(e) => onChange({ ...draft, date: e.target.value })} /></Label> : draft.mode === 'week' ? <Label text="週の開始日"><Input type="date" value={draft.weekStart} onChange={(e) => onChange({ ...draft, weekStart: e.target.value })} /></Label> : <Label text="対象月"><Input type="month" value={draft.month} onChange={(e) => onChange({ ...draft, month: e.target.value })} /></Label>}{draft.mode !== 'single' && <Label text="曜日指定"><div className="grid grid-cols-7 gap-2">{weekdays.map((day, index) => <button key={day} type="button" onClick={() => onChange({ ...draft, weekdays: draft.weekdays.includes(index) ? draft.weekdays.filter((v) => v !== index) : [...draft.weekdays, index].sort() })} className={`rounded-xl px-2 py-3 text-sm font-bold ${draft.weekdays.includes(index) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{day}</button>)}</div></Label>}<div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">作成予定: {preview.length}件 {preview.slice(0, 8).join(' / ')}{preview.length > 8 ? ' ...' : ''}</div><Button className="w-full rounded-2xl" onClick={onCreate} disabled={!template || preview.length === 0}>案件を作成</Button></div>; }
