'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDateTimeJa, formatPeriodLabel, getCurrentSubmissionPeriod, getDaysUntilDeadline, getPeriodDateRange, periodTypeLabel } from '@/lib/availabilityPeriods';
import { LOGIN_REQUIRED_MESSAGE, getCurrentStaffProfile } from '@/lib/staffAuth';
import { mockAvailabilityPeriods, mockCompany } from '@/lib/mockData';
import { listAvailabilities, listAvailabilityPeriods, upsertAvailabilities } from '@/lib/repositories/availabilityRepository';
import type { Availability, AvailabilityPeriod, AvailabilityPeriodType, AvailabilityStatus, Profile } from '@/lib/types';

const options: { value: AvailabilityStatus; mark: string; label: string; buttonClassName: string; activeClassName: string; cellClassName: string }[] = [
  { value: 'available', mark: '○', label: 'いける', buttonClassName: 'border-green-200 bg-green-50 text-green-700', activeClassName: 'border-green-500 bg-green-500 text-white shadow-green-200', cellClassName: 'border-green-200 bg-green-50/80' },
  { value: 'conditional', mark: '△', label: '条件付き', buttonClassName: 'border-orange-200 bg-orange-50 text-orange-700', activeClassName: 'border-orange-500 bg-orange-500 text-white shadow-orange-200', cellClassName: 'border-orange-200 bg-orange-50/80' },
  { value: 'unavailable', mark: '×', label: 'いけない', buttonClassName: 'border-rose-100 bg-rose-50 text-rose-600', activeClassName: 'border-rose-500 bg-rose-500 text-white shadow-rose-200', cellClassName: 'border-rose-100 bg-rose-50/70' },
];

const fmt = (date: Date) => date.toISOString().slice(0, 10);
const today = fmt(new Date());
const monthLabel = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
const toMonthInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const availabilityKey = (row: Pick<Availability, 'work_date' | 'staff_id'>) => `${row.staff_id}:${row.work_date}`;

type EditableAvailability = Availability & { isDirty?: boolean };

export default function Page() {
  const router = useRouter();
  const [periodType, setPeriodType] = useState<AvailabilityPeriodType>('monthly');
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(mockAvailabilityPeriods);
  const [month, setMonth] = useState(() => new Date('2026-07-01'));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avs, setAvs] = useState<EditableAvailability[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, Pick<Availability, 'status' | 'note'>>>({});
  const [msg, setMsg] = useState('ログイン中スタッフ本人の勤務可能日を表示しています');
  const [isSaving, setIsSaving] = useState(false);

  const period = useMemo(() => getCurrentSubmissionPeriod(periods), [periods]);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const weekDays = useMemo(() => buildWeekDays(period), [period]);
  const daysLeft = getDaysUntilDeadline(period.deadline);
  const isAfterDeadline = daysLeft < 0;
  const avByDate = useMemo(() => new Map(avs.filter((a) => a.staff_id === profile?.id).map((a) => [a.work_date, a])), [avs, profile?.id]);
  const dirtyRows = useMemo(() => avs.filter((a) => a.staff_id === profile?.id && isDirtyAvailability(a, savedSnapshot)), [avs, profile?.id, savedSnapshot]);

  useEffect(() => {
    (async () => {
      const { profile: currentProfile, message } = await getCurrentStaffProfile({ createIfMissing: true });
      if (!currentProfile) {
        setMsg(message ?? 'ログイン情報を確認できません。再ログインしてください。');
        if ((message ?? LOGIN_REQUIRED_MESSAGE) === LOGIN_REQUIRED_MESSAGE) router.replace('/staff/login');
        return;
      }
      setProfile(currentProfile);
      const [data, periodRows] = await Promise.all([listAvailabilities(currentProfile.id), listAvailabilityPeriods()]);
      setPeriods(periodRows);
      const currentPeriod = getCurrentSubmissionPeriod(periodRows);
      setPeriodType(currentPeriod.period_type);
      if (currentPeriod.target_month) setMonth(new Date(`${currentPeriod.target_month}-01`));
      setAvs(data);
      setSavedSnapshot(toSnapshot(data.filter((a) => a.staff_id === currentProfile.id)));
      setMsg('Supabase実データを表示しています。変更は「変更を保存」まで送信されません。');
    })().catch((error) => setMsg((error as Error).message));
  }, [router]);

  function updateLocal(workDate: string, status: AvailabilityStatus, note?: string) {
    if (!profile) return;
    const currentNote = avByDate.get(workDate)?.note ?? '';
    setAvs((current) => upsertLocalAvailability(current, profile.id, profile.company_id, workDate, status, status === 'conditional' ? (note ?? currentNote) : ''));
  }

  function updateNote(workDate: string, note: string) {
    if (!profile) return;
    setAvs((current) => upsertLocalAvailability(current, profile.id, profile.company_id, workDate, 'conditional', note));
  }

  async function saveChanges() {
    if (!profile) { setMsg('プロフィールが見つかりません。管理者に確認してください。'); return; }
    if (!dirtyRows.length) return;
    setIsSaving(true);
    const rows = dirtyRows.map(({ company_id, work_date, status, note }) => ({ company_id, work_date, status, note, staff_id: profile.id }));
    try {
      const saved = await upsertAvailabilities(rows);
      const normalized = saved.length ? saved : dirtyRows;
      setAvs((current) => mergeSavedRows(current, normalized, profile.id));
      setSavedSnapshot((current) => ({ ...current, ...toSnapshot(normalized.filter((a) => a.staff_id === profile.id)) }));
      setMsg(`${rows.length}件の変更を保存しました。ページ更新後も選択状態が残ります。`);
    } catch (error) {
      setMsg(`${(error as Error).message}（保存できませんでした。変更は画面上に残っています）`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-x-hidden pb-28">
      <PageHeader title="予定提出" description="カレンダー上で日付ごとに ○ △ × を直接選び、最後にまとめて保存します。" />
      {msg && <div className="mb-4"><Badge tone="blue">{msg}</Badge></div>}
      <Card className="mb-4 p-4"><div className={`mb-4 rounded-2xl border p-4 ${isAfterDeadline ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-100 bg-blue-50 text-blue-900'}`}><p className="font-bold">{period.period_type === 'monthly' ? `${formatPeriodLabel(period)}の勤務可能日は ${formatDateTimeJa(period.deadline)} までに提出してください` : `${formatPeriodLabel(period)} の勤務可能日を ${formatDateTimeJa(period.deadline)} までに提出してください`}</p>{isAfterDeadline && <p className="mt-1 text-sm font-semibold">締切後です。今回は警告のみ表示し、編集は可能です。</p>}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-bold text-slate-950">{periodType === 'monthly' ? monthLabel(month) : `${formatPeriodLabel(period)} の勤務可能日を提出`}</h2><p className="text-sm text-slate-500">日付セル内の ○ △ × を連続でタップできます。保存はまだ行われません。</p></div>
          {periodType === 'monthly' && <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex"><Button variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>前月</Button><Input type="month" value={toMonthInput(month)} onChange={(e) => setMonth(new Date(`${e.target.value}-01`))} className="w-36" /><Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>翌月</Button></div>}
        </div>
      </Card>
      {periodType === 'monthly' ? <Card className="p-2 sm:p-5"><div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 sm:gap-2">{['日','月','火','水','木','金','土'].map((d) => <div key={d}>{d}</div>)}</div><div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">{days.map((day) => <AvailabilityCell key={day.date} day={day} inCurrentRange={day.month === month.getMonth()} availability={avByDate.get(day.date)} onSelect={updateLocal} onNote={updateNote} />)}</div></Card> : <Card className="p-4"><div className="grid gap-3 sm:grid-cols-7">{weekDays.map((day) => <AvailabilityCell key={day.date} day={day} inCurrentRange availability={avByDate.get(day.date)} onSelect={updateLocal} onNote={updateNote} />)}</div></Card>}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 sm:bottom-5"><div className={`mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-3xl border p-3 shadow-2xl backdrop-blur ${dirtyRows.length ? 'border-blue-200 bg-white/95 shadow-blue-100' : 'border-slate-200 bg-white/85 shadow-slate-100'}`}><div><p className="text-sm font-black text-slate-950">{dirtyRows.length ? `${dirtyRows.length}件の変更があります` : '未保存の変更はありません'}</p><p className="text-xs font-bold text-slate-400">○△×を選んだ後、このボタンでまとめて保存します</p></div><Button className={`min-h-12 rounded-2xl px-5 ${dirtyRows.length ? '' : 'opacity-60'}`} disabled={!dirtyRows.length || isSaving} onClick={saveChanges}>{isSaving ? '保存中...' : '変更を保存'}</Button></div></div>
    </div>
  );
}

function AvailabilityCell({ day, inCurrentRange, availability, onSelect, onNote }: { day: { date: string; day?: number; label?: string; weekday?: string }; inCurrentRange: boolean; availability?: EditableAvailability; onSelect: (workDate: string, status: AvailabilityStatus) => void; onNote: (workDate: string, note: string) => void }) {
  const activeOption = options.find((o) => o.value === availability?.status);
  const isToday = day.date === today;
  return <div className={`min-h-24 rounded-2xl border p-1.5 transition sm:min-h-32 sm:p-2 ${inCurrentRange ? (activeOption?.cellClassName ?? 'border-slate-100 bg-white text-slate-700') : 'border-slate-100 bg-slate-50 text-slate-300'} ${isToday ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
    <div className="mb-1 flex items-center justify-between gap-1"><div><span className="text-sm font-black sm:text-base">{day.day ?? day.label}</span>{day.weekday && <p className="text-[10px] font-bold text-slate-400">{day.weekday}</p>}</div>{isToday && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">今日</span>}</div>
    <div className="grid grid-cols-3 gap-1" aria-label={`${day.date}の勤務可否`}>
      {options.map((option) => {
        const active = availability?.status === option.value;
        return <button key={option.value} type="button" onClick={(event) => { event.stopPropagation(); onSelect(day.date, option.value); }} className={`min-h-10 touch-manipulation rounded-xl border text-base font-black shadow-sm transition active:scale-95 sm:min-h-11 ${active ? option.activeClassName : `${option.buttonClassName} opacity-75 hover:opacity-100`}`} aria-pressed={active} title={option.label}>{option.mark}</button>;
      })}
    </div>
    {availability?.status === 'conditional' && <Input className="mt-1 h-9 rounded-xl px-2 text-xs" placeholder="メモ" value={availability.note ?? ''} onClick={(event) => event.stopPropagation()} onChange={(e) => onNote(day.date, e.target.value)} />}
    {!availability && <p className="mt-2 text-center text-[10px] font-bold text-slate-300">未入力</p>}
  </div>;
}

function buildWeekDays(period: AvailabilityPeriod) {
  const { start } = getPeriodDateRange(period);
  const week = ['日','月','火','水','木','金','土'];
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(`${start}T00:00:00`); d.setDate(d.getDate() + i); return { date: fmt(d), label: `${d.getMonth() + 1}/${d.getDate()}`, weekday: week[d.getDay()] }; });
}
function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { date: fmt(d), day: d.getDate(), month: d.getMonth() }; });
}
function addMonths(date: Date, diff: number) { return new Date(date.getFullYear(), date.getMonth() + diff, 1); }
function upsertLocalAvailability(current: EditableAvailability[], staffId: string, companyId: string, workDate: string, status: AvailabilityStatus, note: string) {
  const existing = current.find((a) => a.work_date === workDate && a.staff_id === staffId);
  if (existing) return current.map((a) => (a.id === existing.id ? { ...a, status, note } : a));
  return [...current, { id: `availability-${staffId}-${workDate}`, company_id: companyId || mockCompany.id, staff_id: staffId, work_date: workDate, status, note, created_at: new Date().toISOString() }];
}
function toSnapshot(rows: Pick<Availability, 'staff_id' | 'work_date' | 'status' | 'note'>[]) { return Object.fromEntries(rows.map((row) => [availabilityKey(row), { status: row.status, note: row.note ?? '' }])); }
function isDirtyAvailability(row: Availability, snapshot: Record<string, Pick<Availability, 'status' | 'note'>>) { const saved = snapshot[availabilityKey(row)]; return !saved || saved.status !== row.status || (saved.note ?? '') !== (row.note ?? ''); }
function mergeSavedRows(current: EditableAvailability[], savedRows: Availability[], staffId: string) {
  const savedMap = new Map(savedRows.map((row) => [availabilityKey(row), row]));
  const merged = current.map((row) => savedMap.get(availabilityKey(row)) ? { ...row, ...savedMap.get(availabilityKey(row)) } : row);
  savedRows.forEach((row) => { if (row.staff_id === staffId && !merged.some((item) => availabilityKey(item) === availabilityKey(row))) merged.push(row); });
  return merged;
}
