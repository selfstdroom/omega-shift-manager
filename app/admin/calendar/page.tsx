'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { getDemoAssignments, getProjectFill } from '@/lib/demo';
import { mockProjects, mockWorkplaces } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Assignment, Project, Workplace } from '@/lib/types';

type ProjectState = '未配置' | '配置OK' | '人数不足' | 'リーダー不足';
type DaySummary = { date: string; projects: Project[]; ok: number; peopleShortage: number; leaderShortage: number; unassigned: number; confirmed: number };
const STORAGE_KEY = 'omega-demo-projects';
const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
const monthTitle = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' });
const dateLabel = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
const toDateKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
const requiredLeaders = (project: Project) => Math.max(1, project.required_leaders ?? 0);
const isConfirmed = (project: Project, assignments: Assignment[]) => { const xs = assignments.filter((a) => a.project_id === project.id); return xs.length > 0 && xs.every((a) => a.status === 'confirmed'); };
const getState = (project: Project, assignments: Assignment[]): ProjectState => { const f = getProjectFill(project, assignments); if (f.assigned === 0) return '未配置'; if (!f.peopleOk) return '人数不足'; if (!f.leadersOk) return 'リーダー不足'; return '配置OK'; };
const stateTone = (state: ProjectState) => state === '配置OK' ? 'green' : state === '人数不足' ? 'orange' : state === 'リーダー不足' ? 'red' : 'slate';
const stateBorder = (state: ProjectState, confirmed: boolean) => confirmed ? 'border-l-blue-500 bg-blue-50/50' : state === '配置OK' ? 'border-l-green-500' : state === '人数不足' ? 'border-l-orange-500' : state === 'リーダー不足' ? 'border-l-red-500' : 'border-l-slate-400';

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [workplaces, setWorkplaces] = useState<Workplace[]>(mockWorkplaces);
  const [assignments, setAssignments] = useState<Assignment[]>(getDemoAssignments());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date()));
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [notice, setNotice] = useState('デモモードで表示中（ログインなし・Supabaseなしでも確認できます）');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setProjects(JSON.parse(saved) as Project[]);
    (async () => {
      const s = getSupabaseBrowserClient();
      if (!s) return;
      const [{ data: ps }, { data: ws }, { data: as }] = await Promise.all([s.from('projects').select('*').order('work_date'), s.from('workplaces').select('*'), s.from('assignments').select('*')]);
      if (ps?.length) setProjects(ps as Project[]);
      if (ws?.length) setWorkplaces(ws as Workplace[]);
      if (as?.length) setAssignments(as as Assignment[]);
      setNotice('Supabaseのデータと同期しています。未接続時は仮データで動作します');
    })();
  }, []);

  const monthGrid = useMemo(() => { const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); }, [currentMonth]);
  const summaries = useMemo(() => projects.reduce<Record<string, DaySummary>>((acc, project) => { const s = acc[project.work_date] ?? { date: project.work_date, projects: [], ok: 0, peopleShortage: 0, leaderShortage: 0, unassigned: 0, confirmed: 0 }; const state = getState(project, assignments); s.projects.push(project); if (state === '配置OK') s.ok += 1; if (state === '人数不足') s.peopleShortage += 1; if (state === 'リーダー不足') s.leaderShortage += 1; if (state === '未配置') s.unassigned += 1; if (isConfirmed(project, assignments)) s.confirmed += 1; acc[project.work_date] = s; return acc; }, {}), [projects, assignments]);
  const selectedSummary = selectedDate ? summaries[selectedDate] ?? { date: selectedDate, projects: [], ok: 0, peopleShortage: 0, leaderShortage: 0, unassigned: 0, confirmed: 0 } : null;
  const monthPrefix = `${currentMonth.getFullYear()}-${`${currentMonth.getMonth() + 1}`.padStart(2, '0')}`;
  const monthStats = useMemo(() => Object.values(summaries).filter((s) => s.date.startsWith(monthPrefix)).reduce((acc, s) => ({ projects: acc.projects + s.projects.length, ok: acc.ok + s.ok, peopleShortage: acc.peopleShortage + s.peopleShortage, leaderShortage: acc.leaderShortage + s.leaderShortage, confirmed: acc.confirmed + s.confirmed }), { projects: 0, ok: 0, peopleShortage: 0, leaderShortage: 0, confirmed: 0 }), [summaries, monthPrefix]);
  const workplaceName = (id: string) => workplaces.find((w) => w.id === id)?.name ?? '事業所';

  return <div><PageHeader title="管理者カレンダー" description="月単位で案件数・配置OK・人数不足・リーダー不足・確定済みを俯瞰できます。" actions={<div className="flex gap-2"><Link href="/admin/projects"><Button variant="secondary">案件管理へ</Button></Link><Link href="/admin/auto-assign"><Button>自動配置へ</Button></Link></div>} />
    <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"><Badge tone="blue">{notice}</Badge><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>前月</Button><Button variant="secondary" onClick={() => { const today = new Date(); setCurrentMonth(today); setSelectedDate(toDateKey(today)); }}>今月へ戻る</Button><Button variant="secondary" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>次月</Button></div></div>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5"><Mini label="案件数" value={monthStats.projects} /><Mini label="配置OK" value={monthStats.ok} tone="green" /><Mini label="人数不足" value={monthStats.peopleShortage} tone="orange" /><Mini label="リーダー不足" value={monthStats.leaderShortage} tone="red" /><Mini label="確定済み" value={monthStats.confirmed} tone="blue" /></div>
    <Card className="overflow-hidden p-0"><div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="text-xl font-black text-slate-950">{monthTitle.format(currentMonth)}</h2><p className="text-xs font-bold text-slate-400">月表示</p></div><div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-black text-slate-500">{weekDays.map((d) => <div key={d} className="py-2">{d}</div>)}</div><div className="grid grid-cols-7">{monthGrid.map((date) => { const key = toDateKey(date); const summary = summaries[key]; const active = selectedDate === key; return <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-h-28 border-r border-t border-slate-100 p-1.5 text-left transition hover:bg-blue-50 sm:min-h-36 sm:p-2 ${date.getMonth() === currentMonth.getMonth() ? 'bg-white' : 'bg-slate-50/70 text-slate-300'} ${active ? 'ring-2 ring-inset ring-blue-500' : ''}`}><div className="flex items-center justify-between"><span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black ${key === toDateKey(new Date()) ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>{date.getDate()}</span>{summary?.confirmed ? <span className="text-blue-600">✓</span> : null}</div>{summary && <div className="mt-2 space-y-1"><Pill tone="blue" label={`案件 ${summary.projects.length}`} /><Pill tone="green" label={`OK ${summary.ok}`} /><Pill tone="orange" label={`人数不足 ${summary.peopleShortage}`} /><Pill tone="red" label={`L不足 ${summary.leaderShortage}`} /><Pill tone="slate" label={`未配置 ${summary.unassigned}`} /></div>}</button>; })}</div></Card>
    <ResponsiveEditor open={!!selectedSummary && !detailProject} title={selectedSummary ? dateLabel.format(new Date(`${selectedSummary.date}T00:00:00`)) : ''} subtitle="この日の案件一覧" onClose={() => setSelectedDate(null)}>{selectedSummary && <div className="space-y-3">{selectedSummary.projects.length === 0 ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">この日の案件はありません。</p> : selectedSummary.projects.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((project) => <ProjectCard key={project.id} project={project} assignments={assignments} workplace={workplaceName(project.workplace_id)} onClick={() => setDetailProject(project)} />)}</div>}</ResponsiveEditor>
    <ResponsiveEditor open={!!detailProject} title={detailProject?.title ?? ''} subtitle="案件詳細と操作" onClose={() => setDetailProject(null)}>{detailProject && <ProjectDetail project={detailProject} assignments={assignments} workplace={workplaceName(detailProject.workplace_id)} />}</ResponsiveEditor>
  </div>;
}
function ProjectCard({ project, assignments, workplace, onClick }: { project: Project; assignments: Assignment[]; workplace: string; onClick: () => void }) { const f = getProjectFill(project, assignments); const state = getState(project, assignments); const confirmed = isConfirmed(project, assignments); return <button type="button" onClick={onClick} className={`w-full rounded-2xl border border-slate-100 border-l-4 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stateBorder(state, confirmed)}`}><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{project.title}</h3><Badge tone={stateTone(state)}>{state}</Badge>{confirmed && <Badge tone="blue">✓ 確定済み</Badge>}</div><p className="mt-2 text-sm font-semibold text-slate-600">🕘 {project.start_time}-{project.end_time}</p><p className="mt-1 text-sm text-slate-500">📍 {workplace} · {project.location}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Info label="必要人数" value={`${project.required_people}名`} /><Info label="配置済み" value={`${f.assigned}名`} danger={!f.peopleOk} /><Info label="必要L" value={`${requiredLeaders(project)}名`} /><Info label="Leader" value={`${f.leaders}名`} danger={!f.leadersOk} /></div></button>; }
function ProjectDetail({ project, assignments, workplace }: { project: Project; assignments: Assignment[]; workplace: string }) { const f = getProjectFill(project, assignments); const state = getState(project, assignments); const confirmed = isConfirmed(project, assignments); return <div className="space-y-4"><ProjectCard project={project} assignments={assignments} workplace={workplace} onClick={() => undefined} /><div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold text-slate-900">備考</p><p className="mt-1">{project.note || '備考はありません。'}</p><p className="mt-3 font-bold text-slate-900">確定状態</p><p className="mt-1">{confirmed ? '✓ 確定済み' : `未確定（${state}・${f.assigned}/${project.required_people}名配置）`}</p></div><div className="grid gap-2"><Link href={`/admin/projects?projectId=${project.id}`}><Button variant="secondary" className="w-full rounded-2xl">編集</Button></Link><Link href={`/admin/auto-assign?projectId=${project.id}`}><Button className="w-full rounded-2xl">自動配置へ進む</Button></Link><Link href={`/admin/assignments/results?projectId=${project.id}`}><Button variant="secondary" className="w-full rounded-2xl">配置結果を見る</Button></Link><Link href={`/admin/auto-assign?projectId=${project.id}`}><Button className="w-full rounded-2xl bg-blue-700">確定する</Button></Link></div></div>; }
function Mini({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate' }) { const tones = { blue: 'text-blue-700', green: 'text-green-700', orange: 'text-orange-700', red: 'text-red-700', slate: 'text-slate-950' }; return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><p className="text-xs font-black text-slate-400">{label}</p><p className={`mt-1 text-3xl font-black ${tones[tone]}`}>{value}</p></div>; }
function Pill({ tone, label }: { tone: 'blue' | 'green' | 'orange' | 'red' | 'slate'; label: string }) { const tones = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', orange: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700', slate: 'bg-slate-100 text-slate-600' }; return <span className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-black sm:text-xs ${tones[tone]}`}>{label}</span>; }
function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <div className={`rounded-xl p-3 ${danger ? 'bg-orange-50 text-orange-700' : 'bg-white text-slate-800'}`}><p className="text-xs font-bold opacity-60">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
