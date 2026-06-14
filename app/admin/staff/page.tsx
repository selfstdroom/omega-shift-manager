'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { Select } from '@/components/ui/Select';
import { getDemoAssignments } from '@/lib/demo';
import { mockAvailabilities, mockCompany, mockProfiles, mockProjects, mockWorkplaces } from '@/lib/mockData';
import { listAvailabilities } from '@/lib/repositories/availabilityRepository';
import { listWorkplaces } from '@/lib/repositories/workplaceRepository';
import { deleteStaff, listProfiles, saveStaff } from '@/lib/repositories/staffRepository';
import type { Availability, Profile, StaffRole, Workplace } from '@/lib/types';

type StaffDraft = Pick<Profile, 'name' | 'phone' | 'workplace_id' | 'staff_role'> & { note: string };
type EditableProfile = Profile & { note?: string | null };
type RoleFilter = 'all' | StaffRole;
type SubmitFilter = 'all' | 'missing';

const storageKey = 'omega-demo-staff';
const emptyDraft = (workplaceId = mockWorkplaces[0]?.id ?? ''): StaffDraft => ({ name: '', phone: '', workplace_id: workplaceId, staff_role: 'staff', note: '' });
const monthKey = new Date().toISOString().slice(0, 7);

export default function Page() {
  const [items, setItems] = useState<EditableProfile[]>(mockProfiles.filter((p) => p.role === 'staff'));
  const [workplaces, setWorkplaces] = useState<Workplace[]>(mockWorkplaces);
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [msg, setMsg] = useState('デモデータで操作できます（Supabase未接続でも作成・編集できます）');
  const [q, setQ] = useState('');
  const [wp, setWp] = useState('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [submit, setSubmit] = useState<SubmitFilter>('all');
  const [editing, setEditing] = useState<EditableProfile | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft());

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setItems(JSON.parse(saved));
    load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  async function load() {
    try {
      const [data, ws, avs] = await Promise.all([listProfiles('staff'), listWorkplaces(), listAvailabilities()]);
      setItems(data as EditableProfile[]); setWorkplaces(ws); setAvailabilities(avs);
      setMsg('Supabase接続時は実データ、未接続時はデモデータを表示します。');
    } catch (error) { setMsg(`${(error as Error).message}（デモデータを表示中）`); }
  }

  const assignmentRows = useMemo(() => getDemoAssignments(), []);
  const staffStats = useMemo(() => new Map(items.map((p) => {
    const monthAssignments = assignmentRows.filter((a) => a.staff_id === p.id && mockProjects.find((project) => project.id === a.project_id)?.work_date.startsWith(monthKey));
    const upcoming = assignmentRows
      .filter((a) => a.staff_id === p.id)
      .map((a) => ({ assignment: a, project: mockProjects.find((project) => project.id === a.project_id) }))
      .filter((row) => row.project)
      .sort((a, b) => (a.project?.work_date ?? '').localeCompare(b.project?.work_date ?? ''));
    const submitted = availabilities.some((a) => a.staff_id === p.id && a.work_date.startsWith(monthKey));
    return [p.id, { count: monthAssignments.length, upcoming, submitted }] as const;
  })), [assignmentRows, availabilities, items]);

  const averageCount = useMemo(() => items.length ? [...staffStats.values()].reduce((sum, s) => sum + s.count, 0) / items.length : 0, [items.length, staffStats]);
  const filtered = useMemo(() => items.filter((p) => {
    const stats = staffStats.get(p.id);
    return (wp === 'all' || p.workplace_id === wp)
      && (role === 'all' || p.staff_role === role)
      && (submit === 'all' || !stats?.submitted)
      && `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase());
  }), [items, q, role, staffStats, submit, wp]);

  async function createStaff() {
    if (!draft.name.trim()) { setMsg('氏名を入力してください'); return; }
    const next: EditableProfile = { id: `demo-staff-${Date.now()}`, company_id: mockCompany.id, role: 'staff', created_at: new Date().toISOString(), ...draft };
    setItems((current) => [next, ...current]);
    setDraft(emptyDraft(draft.workplace_id));
    setMsg('スタッフを作成しました。自動配置の候補一覧にも反映されます。');
    try { const saved = await saveStaff(next); setItems((current) => current.map((x) => x.id === next.id ? saved as EditableProfile : x)); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ作成しました）`); }
  }

  async function save(next = editing) {
    if (!next) return;
    setItems((current) => current.map((x) => (x.id === next.id ? next : x)));
    try { await saveStaff(next); setMsg('保存しました'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ更新しました）`); }
    setEditing(null);
  }

  async function remove(target = editing) {
    if (!target || !confirm('このスタッフを無効化/削除しますか？')) return;
    setItems((current) => current.filter((x) => x.id !== target.id));
    setExpandedIds((current) => current.filter((id) => id !== target.id));
    try { await deleteStaff(target.id); setMsg('スタッフを削除しました。'); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ削除しました）`); }
    if (editing?.id === target.id) setEditing(null);
  }

  const leaderCount = items.filter((p) => p.staff_role === 'leader').length;
  const missingCount = [...staffStats.values()].filter((s) => !s.submitted).length;
  const toggleExpanded = (staffId: string) => setExpandedIds((current) => current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId]);

  return <div><PageHeader title="スタッフ一覧" description="自動配置に使う役職・所属・稼働状況を、操作可能なスタッフカードとして管理します。" actions={<Badge tone="blue">Leader {leaderCount}名</Badge>} />{msg && <p className="mb-3 text-sm text-blue-700">{msg}</p>}
    <Card className="mb-5 p-4 sm:p-5"><h2 className="text-lg font-bold text-slate-950">スタッフ新規作成</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Input placeholder="氏名" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><Input placeholder="電話番号" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /><Select value={draft.workplace_id} onChange={(e) => setDraft({ ...draft, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select><Select value={draft.staff_role} onChange={(e) => setDraft({ ...draft, staff_role: e.target.value as StaffRole })}><option value="staff">staff</option><option value="leader">leader</option></Select><Input placeholder="メモ" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div><Button onClick={createStaff} className="mt-4 w-full sm:w-auto">追加する</Button></Card>
    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input placeholder="名前・電話で検索" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select><Select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}><option value="all">全役職</option><option value="leader">leader</option><option value="staff">staff</option></Select><Select value={submit} onChange={(e) => setSubmit(e.target.value as SubmitFilter)}><option value="all">提出状況すべて</option><option value="missing">勤務可能日 未提出のみ（{missingCount}名）</option></Select></div>
    <div className="space-y-3">{filtered.map((p) => <StaffCard key={p.id} staff={p} workplace={workplaces.find((w) => w.id === p.workplace_id)} stats={staffStats.get(p.id)} averageCount={averageCount} expanded={expandedIds.includes(p.id)} onToggle={() => toggleExpanded(p.id)} onEdit={() => setEditing(p)} onDelete={() => remove(p)} />)}</div>
    <ResponsiveEditor open={!!editing} title={editing?.name ?? ''} subtitle="スタッフ詳細" onClose={() => setEditing(null)}>{editing && <div className="space-y-4"><Label text="名前"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Label><Label text="電話番号"><Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Label><Label text="所属事業所"><Select value={editing.workplace_id ?? ''} onChange={(e) => setEditing({ ...editing, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Label><Label text="役職"><Select value={editing.staff_role} onChange={(e) => setEditing({ ...editing, staff_role: e.target.value as StaffRole })}><option value="staff">staff</option><option value="leader">leader</option></Select></Label><Label text="メモ"><Input value={editing.note ?? ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></Label><div className="grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => save({ ...editing, staff_role: 'leader' })}>リーダーに変更</Button><Button variant="secondary" onClick={() => save({ ...editing, staff_role: 'staff' })}>一般スタッフに変更</Button></div><div className="grid grid-cols-2 gap-3 pt-3"><Button onClick={() => save()}>保存</Button><Button variant="danger" onClick={() => remove()}>削除/無効化</Button></div></div>}</ResponsiveEditor></div>;
}

function StaffCard({ staff, workplace, stats, averageCount, expanded, onToggle, onEdit, onDelete }: { staff: EditableProfile; workplace?: Workplace; stats?: { count: number; upcoming: { project?: { title: string; work_date: string; start_time: string; end_time: string } }[]; submitted: boolean }; averageCount: number; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const heavy = (stats?.count ?? 0) > averageCount + 0.5;
  const light = (stats?.count ?? 0) < averageCount - 0.5;
  const upcoming = stats?.upcoming ?? [];
  const firstProject = upcoming[0]?.project;
  return <Card className={`overflow-hidden border-l-4 transition hover:shadow-md ${expanded ? 'border-l-blue-600 bg-blue-50/40 ring-2 ring-blue-100' : staff.staff_role === 'leader' ? 'border-l-blue-500 bg-white' : 'border-l-slate-300 bg-white'}`}>
    <button type="button" aria-expanded={expanded} onClick={onToggle} className="group flex w-full flex-col gap-3 p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-100 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">{staff.name}</h2>
          <Badge tone={staff.staff_role === 'leader' ? 'blue' : 'slate'}>{staff.staff_role === 'leader' ? '👑 leader' : 'staff'}</Badge>
          <Badge tone={stats?.submitted ? 'green' : 'red'}>{stats?.submitted ? '提出済み' : '勤務可能日未提出'}</Badge>
        </div>
        <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
          <span className="truncate">📍 {workplace?.name ?? '未設定'}</span>
          <span className="truncate">☎ {staff.phone || '未登録'}</span>
          <span className="text-blue-600 sm:hidden">{expanded ? '詳細を閉じる' : '詳細を開く'}</span>
        </div>
      </div>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black text-blue-600 shadow-sm ring-1 ring-slate-100 transition group-hover:bg-blue-600 group-hover:text-white ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
    </button>
    {expanded && <div className="border-t border-blue-100 bg-white/85 p-4 sm:p-5">
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <Info label="今月の配置数" value={`${stats?.count ?? 0}件`} tone={heavy ? 'red' : light ? 'orange' : 'green'} helper={heavy ? '多め' : light ? '少なめ・優先候補' : '標準'} />
        <Info label="直近の勤務予定" value={firstProject?.work_date ?? '未定'} helper={firstProject ? `${firstProject.title} ${firstProject.start_time}-${firstProject.end_time}` : '予定なし'} />
        <Info label="備考" value={staff.note || '未登録'} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{upcoming.length ? upcoming.slice(0, 4).map((row) => <Badge key={`${row.project?.title}-${row.project?.work_date}-${row.project?.start_time}`} tone="blue">{row.project?.work_date} {row.project?.start_time} {row.project?.title}</Badge>) : <Badge tone="slate">勤務予定なし</Badge>}</div>
      <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
        <Button variant="secondary" className="w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); onEdit(); }}>編集</Button>
        <Button variant="danger" className="w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); onDelete(); }}>削除/無効化</Button>
      </div>
    </div>}
  </Card>;
}

function Info({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper?: string; tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate' }) { return <div className={`rounded-2xl p-3 ${tone === 'red' ? 'bg-red-50' : tone === 'orange' ? 'bg-orange-50' : tone === 'green' ? 'bg-green-50' : 'bg-slate-50'}`}><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p>{helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}</div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{text}</span>{children}</label>; }
