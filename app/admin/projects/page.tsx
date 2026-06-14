'use client';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { getProjectFill, getDemoAssignments } from '@/lib/demo';
import { mockAvailabilities, mockProfiles, mockProjects, mockWorkplaces } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Assignment, Availability, Project, Profile, Workplace } from '@/lib/types';

export default function Page() {
  const [items, setItems] = useState<Project[]>(mockProjects);
  const [workplaces, setWorkplaces] = useState<Workplace[]>(mockWorkplaces);
  const [assignments, setAssignments] = useState<Assignment[]>(getDemoAssignments());
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [q, setQ] = useState('');
  const [wp, setWp] = useState('all');
  useEffect(() => { (async () => { const s = getSupabaseBrowserClient(); if (!s) return; const [{ data: ps }, { data: ws }, { data: as }, { data: prs }, { data: avs }] = await Promise.all([s.from('projects').select('*').order('work_date'), s.from('workplaces').select('*'), s.from('assignments').select('*'), s.from('profiles').select('*'), s.from('availabilities').select('*')]); if (ps?.length) setItems(ps as Project[]); if (ws?.length) setWorkplaces(ws as Workplace[]); if (as?.length) setAssignments(as as Assignment[]); if (prs?.length) setProfiles(prs as Profile[]); if (avs?.length) setAvailabilities(avs as Availability[]); })(); }, []);
  const filtered = useMemo(() => items.filter((p) => (wp === 'all' || p.workplace_id === wp) && `${p.title} ${p.location}`.toLowerCase().includes(q.toLowerCase())), [items, q, wp]);
  const availableStaff = (p: Project) => availabilities.filter((a) => a.work_date === p.work_date && a.status !== 'unavailable').sort((a, b) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1));
  return <div><PageHeader title="案件管理" description="案件ごとに充足状況と、その日勤務可能なスタッフを確認できます。未入力・不可は候補に表示しません。" /><div className="mb-5 grid gap-3 sm:grid-cols-2"><Input placeholder="案件名・場所で検索" value={q} onChange={(e) => setQ(e.target.value)}/><Select value={wp} onChange={(e) => setWp(e.target.value)}><option value="all">全事業所</option>{workplaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div><div className="grid gap-4">{filtered.map((p) => { const f = getProjectFill(p, assignments); const staff = availableStaff(p); return <Card key={p.id} className="p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">{p.title}</h2><Badge tone={f.peopleOk ? 'green' : 'orange'}>人数 {f.assigned}/{p.required_people}</Badge><Badge tone={f.leadersOk ? 'blue' : 'red'}>リーダー {f.leaders}/{f.requiredLeaders}</Badge></div><p className="mt-2 text-sm text-slate-500">{workplaces.find((w) => w.id === p.workplace_id)?.name ?? '事業所'} · {p.location}</p></div><div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]"><Info label="日付" value={p.work_date}/><Info label="時間" value={`${p.start_time}-${p.end_time}`}/><Info label="必要人数" value={`${p.required_people}名`}/><Info label="必要L" value={`${f.requiredLeaders}名`}/></div></div>{p.note && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{p.note}</p>}<div className="mt-4"><p className="text-sm font-bold text-slate-700">この日勤務可能なスタッフ</p><div className="mt-2 flex flex-wrap gap-2">{staff.length ? staff.map((a) => <Badge key={`${a.staff_id}-${a.work_date}`} tone={a.status === 'available' ? 'green' : 'orange'}>{profiles.find((profile) => profile.id === a.staff_id)?.name ?? a.staff_id} {a.status === 'available' ? '○' : `△ ${a.note}`}</Badge>) : <Badge tone="slate">候補なし</Badge>}</div></div></Card>; })}</div></div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>; }
