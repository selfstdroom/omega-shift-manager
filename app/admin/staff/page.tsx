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
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
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
    const s = getSupabaseBrowserClient();
    if (!s) return;
    const [{ data, error }, { data: ws }, { data: avs }] = await Promise.all([
      s.from('profiles').select('*').eq('role', 'staff').order('created_at'),
      s.from('workplaces').select('*'),
      s.from('availabilities').select('*'),
    ]);
    if (error) setMsg(`${error.message}（デモデータを表示中）`);
    else {
      if (data?.length) setItems(data as EditableProfile[]);
      if (ws?.length) setWorkplaces(ws as Workplace[]);
      if (avs?.length) setAvailabilities(avs as Availability[]);
      setMsg('Supabase実データ表示中。保存できない項目は画面上のデモ更新として扱います。');
    }
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
    const s = getSupabaseBrowserClient();
    if (s) await s.from('profiles').insert(next);
  }

  async function save(next = editing) {
    if (!next) return;
    setItems((current) => current.map((x) => (x.id === next.id ? next : x)));
    const s = getSupabaseBrowserClient();
    if (!s) { setMsg('Supabase未接続のため画面上のみ保存しました'); setEditing(null); return; }
    const { error } = await s.from('profiles').update({ name: next.name, phone: next.phone, staff_role: next.staff_role, workplace_id: next.workplace_id, note: next.note }).eq('id', next.id);
    setMsg(error ? `${error.message}（画面上のみ更新しました）` : '保存しました');
    setEditing(null);
  }

  function remove() {
    if (!editing || !confirm('このスタッフを無効化/削除しますか？')) return;
    setItems((current) => current.filter((x) => x.id !== editing.id));
    setMsg('デモ上で無効化しました。自動配置候補からも除外されます。');
    setEditing(null);
  }

  const leaderCount = items.filter((p) => p.staff_role === 'leader').length;
  const missingCount = [...staffStats.values()].filter((s) => !s.submitted).length;

  return <div><PageHeader title="スタッフ一覧" description="自動配置に使う役職・所属・稼働状況を、操作可能なスタッフカードとして管理します。" actions={<Badge tone="blue">Leader {leaderCount}名</Badge>} />{msg && <p className="mb-3 text-sm text-blue-700">{msg}</p>}
    <Card className="mb-5 p-4 sm:p-5"><h2 className="text-lg font-bold text-slate-950">スタッフ新規作成</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Input placeholder="氏名" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><Input placeholder="電話番号" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /><Select value={draft.workplace_id} onChange={(e) => setDraft({ ...draft, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select><Select value={draft.staff_role} onChange={(e) => setDraft({ ...draft, staff_role: e.target.value as StaffRole })}><option value="staff">staff</option><option value="leader">leader</option></Select><Input placeholder="メモ" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div><Button onClick={createStaff} className="mt-4 w-full sm:w-auto">追加する</Button></Card>
    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input placeholder="名前・電話で検索" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select><Select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}><option value="all">全役職</option><option value="leader">leader</option><option value="staff">staff</option></Select><Select value={submit} onChange={(e) => setSubmit(e.target.value as SubmitFilter)}><option value="all">提出状況すべて</option><option value="missing">勤務可能日 未提出のみ（{missingCount}名）</option></Select></div>
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filtered.map((p) => <StaffCard key={p.id} staff={p} workplace={workplaces.find((w) => w.id === p.workplace_id)} stats={staffStats.get(p.id)} averageCount={averageCount} onClick={() => setEditing(p)} />)}</div>
    <ResponsiveEditor open={!!editing} title={editing?.name ?? ''} subtitle="スタッフ詳細" onClose={() => setEditing(null)}>{editing && <div className="space-y-4"><Label text="名前"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Label><Label text="電話番号"><Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Label><Label text="所属事業所"><Select value={editing.workplace_id ?? ''} onChange={(e) => setEditing({ ...editing, workplace_id: e.target.value })}>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Label><Label text="役職"><Select value={editing.staff_role} onChange={(e) => setEditing({ ...editing, staff_role: e.target.value as StaffRole })}><option value="staff">staff</option><option value="leader">leader</option></Select></Label><Label text="メモ"><Input value={editing.note ?? ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></Label><div className="grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => save({ ...editing, staff_role: 'leader' })}>リーダーに変更</Button><Button variant="secondary" onClick={() => save({ ...editing, staff_role: 'staff' })}>一般スタッフに変更</Button></div><div className="grid grid-cols-2 gap-3 pt-3"><Button onClick={() => save()}>保存</Button><Button variant="danger" onClick={remove}>削除/無効化</Button></div></div>}</ResponsiveEditor></div>;
}

function StaffCard({ staff, workplace, stats, averageCount, onClick }: { staff: EditableProfile; workplace?: Workplace; stats?: { count: number; upcoming: { project?: { title: string; work_date: string; start_time: string; end_time: string } }[]; submitted: boolean }; averageCount: number; onClick: () => void }) {
  const heavy = (stats?.count ?? 0) > averageCount + 0.5;
  const light = (stats?.count ?? 0) < averageCount - 0.5;
  return <Card role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }} className={`group cursor-pointer border-l-4 p-5 transition hover:-translate-y-1 hover:shadow-md hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-200 ${staff.staff_role === 'leader' ? 'border-l-blue-600' : 'border-l-slate-300'}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-950">{staff.name}</h2><Badge tone={staff.staff_role === 'leader' ? 'blue' : 'slate'}>{staff.staff_role === 'leader' ? '👑 leader' : 'staff'}</Badge>{!stats?.submitted && <Badge tone="red">勤務可能日未提出</Badge>}</div><p className="mt-1 text-sm text-slate-500">📍 {workplace?.name ?? '未設定'}　☎ {staff.phone || '未登録'}</p></div><span className="text-xl text-blue-500 opacity-70 transition group-hover:translate-x-1">›</span></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><Info label="今月の配置数" value={`${stats?.count ?? 0}件`} tone={heavy ? 'red' : light ? 'orange' : 'green'} helper={heavy ? '多め' : light ? '少なめ・優先候補' : '標準'} /><Info label="直近の勤務予定" value={stats?.upcoming[0]?.project?.work_date ?? '未定'} helper={stats?.upcoming[0]?.project?.title ?? '予定なし'} /><Info label="提出状況" value={stats?.submitted ? '提出済み' : '未提出'} tone={stats?.submitted ? 'green' : 'red'} /></div><div className="mt-4 flex flex-wrap gap-2">{stats?.upcoming.length ? stats.upcoming.slice(0, 3).map((row) => <Badge key={row.project?.work_date} tone="blue">{row.project?.work_date} {row.project?.start_time}</Badge>) : <Badge tone="slate">勤務予定なし</Badge>}</div><p className="mt-4 text-xs font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">クリックして編集 →</p></Card>;
}

function Info({ label, value, helper, tone = 'slate' }: { label: string; value: string; helper?: string; tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate' }) { return <div className={`rounded-2xl p-3 ${tone === 'red' ? 'bg-red-50' : tone === 'orange' ? 'bg-orange-50' : tone === 'green' ? 'bg-green-50' : 'bg-slate-50'}`}><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p>{helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}</div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{text}</span>{children}</label>; }
