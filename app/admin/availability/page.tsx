'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { formatDateTimeJa, formatPeriodLabel, getActivePeriod, getDaysUntilDeadline, getSubmissionStats, periodTypeLabel } from '@/lib/availabilityPeriods';
import { mockAvailabilities, mockAvailabilityPeriods, mockProfiles } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Availability, AvailabilityPeriod, AvailabilityPeriodType, Profile } from '@/lib/types';

export default function AdminAvailabilityPage() {
  const [periodType, setPeriodType] = useState<AvailabilityPeriodType>('monthly');
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(mockAvailabilityPeriods);
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [msg, setMsg] = useState('デモデータ表示中（月次・週次どちらも確認できます）');
  useEffect(() => { (async () => { const s = getSupabaseBrowserClient(); if (!s) return; const [{ data: ps }, { data: prs }, { data: avs }] = await Promise.all([s.from('availability_periods').select('*').order('deadline', { ascending: true }), s.from('profiles').select('*'), s.from('availabilities').select('*')]); if (ps?.length) { setPeriods(ps as AvailabilityPeriod[]); setMsg('Supabase実データ表示中'); } if (prs?.length) setProfiles(prs as Profile[]); if (avs?.length) setAvailabilities(avs as Availability[]); })(); }, []);
  const period = useMemo(() => getActivePeriod(periods, periodType), [periods, periodType]);
  const stats = useMemo(() => getSubmissionStats(period, profiles, availabilities), [period, profiles, availabilities]);
  const daysLeft = getDaysUntilDeadline(period.deadline);
  return <div><PageHeader title="勤務可能日 提出状況" description="月ごと・週ごとの提出期限、提出率、未提出者をまとめて確認できます。" /><div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone="blue">{msg}</Badge><Badge tone={daysLeft < 0 ? 'red' : daysLeft <= 3 ? 'orange' : 'green'}>{daysLeft < 0 ? '締切後' : `締切まで${daysLeft}日`}</Badge></div><div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:w-fit">{(['monthly','weekly'] as AvailabilityPeriodType[]).map((type) => <Button key={type} variant={periodType === type ? 'primary' : 'ghost'} onClick={() => setPeriodType(type)}>{periodTypeLabel(type)}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="対象期間" value={formatPeriodLabel(period)} helper={periodTypeLabel(period.period_type)} /><StatCard label="提出期限" value={formatDateTimeJa(period.deadline)} tone={daysLeft < 0 ? 'red' : 'orange'} /><StatCard label="提出済み人数" value={`${stats.submittedCount}/${stats.staff.length}名`} tone="green" /><StatCard label="未提出人数" value={`${stats.unsubmittedCount}名`} tone={stats.unsubmittedCount ? 'red' : 'green'} /></div><Card className="mt-6 p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-slate-950">提出率 {stats.rate}%</h2><p className="text-sm text-slate-500">未提出者にリマインドし、締切前に提出率100%を目指してください。</p></div><Badge tone={stats.unsubmittedCount ? 'red' : 'green'}>{stats.unsubmittedCount ? 'リマインドが必要' : '全員提出済み'}</Badge></div><div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${stats.rate}%` }} /></div></Card><div className="mt-6 grid gap-4 lg:grid-cols-2"><StaffList title="未提出スタッフ" tone="red" people={stats.unsubmitted} empty="未提出者はいません" /><StaffList title="提出済みスタッフ" tone="green" people={stats.submitted} empty="提出済みスタッフはいません" /></div></div>;
}
function StaffList({ title, people, empty, tone }: { title: string; people: Profile[]; empty: string; tone: 'red' | 'green' }) { return <Card className={`p-5 ${tone === 'red' && people.length ? 'border-red-200 bg-red-50/60' : ''}`}><h2 className="text-lg font-bold text-slate-950">{title}</h2><div className="mt-4 space-y-2">{people.length ? people.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"><span className="font-semibold text-slate-800">{p.name}</span><Badge tone={p.staff_role === 'leader' ? 'blue' : 'slate'}>{p.staff_role}</Badge></div>) : <p className="text-sm text-slate-500">{empty}</p>}</div></Card>; }
