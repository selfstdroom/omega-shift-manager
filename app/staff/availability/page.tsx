'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDateTimeJa, formatPeriodLabel, getActivePeriod, getDaysUntilDeadline, getPeriodDateRange, periodTypeLabel } from '@/lib/availabilityPeriods';
import { getCurrentStaffProfile } from '@/lib/staffAuth';
import { mockAvailabilities, mockAvailabilityPeriods, mockCompany } from '@/lib/mockData';
import { listAvailabilities, listAvailabilityPeriods, upsertAvailabilities } from '@/lib/repositories/availabilityRepository';
import type { Availability, AvailabilityPeriod, AvailabilityPeriodType, AvailabilityStatus, Profile } from '@/lib/types';

const options: { value: AvailabilityStatus; mark: string; label: string; className: string; activeClassName: string; cellClassName: string }[] = [
  { value: 'available', mark: '○', label: 'いける', className: 'border-green-200 bg-green-50 text-green-700', activeClassName: 'border-green-500 bg-green-500 text-white shadow-green-200', cellClassName: 'border-green-200 bg-green-50/70' },
  { value: 'conditional', mark: '△', label: '条件付き', className: 'border-orange-200 bg-orange-50 text-orange-700', activeClassName: 'border-orange-500 bg-orange-500 text-white shadow-orange-200', cellClassName: 'border-orange-200 bg-orange-50/70' },
  { value: 'unavailable', mark: '×', label: 'いけない', className: 'border-red-100 bg-slate-100 text-slate-500', activeClassName: 'border-red-500 bg-red-500 text-white shadow-red-200', cellClassName: 'border-slate-200 bg-slate-50' },
];

const fmt = (date: Date) => date.toISOString().slice(0, 10);
const monthLabel = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
const toMonthInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const PANEL_WIDTH = 344;
const PANEL_HEIGHT = 324;
const PANEL_MARGIN = 12;

type PanelPosition = { top: number; left: number };

export default function Page() {
  const [periodType, setPeriodType] = useState<AvailabilityPeriodType>('monthly');
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(mockAvailabilityPeriods);
  const [month, setMonth] = useState(() => new Date('2026-07-01'));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avs, setAvs] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState(fmt(new Date('2026-06-20')));
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const [msg, setMsg] = useState('ログイン中スタッフ本人の勤務可能日を表示しています');

  const period = useMemo(() => getActivePeriod(periods, periodType), [periods, periodType]);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const weekDays = useMemo(() => buildWeekDays(period), [period]);
  const daysLeft = getDaysUntilDeadline(period.deadline);
  const isAfterDeadline = daysLeft < 0;
  const selected = profile ? avs.find((a) => a.work_date === selectedDate && a.staff_id === profile.id) : undefined;

  useEffect(() => {
    (async () => {
      const { profile: currentProfile, message } = await getCurrentStaffProfile();
      if (!currentProfile) { setMsg(message ?? 'ログイン情報を確認できません。再ログインしてください。'); return; }
      setProfile(currentProfile);
      const [data, periodRows] = await Promise.all([listAvailabilities(currentProfile.id), listAvailabilityPeriods()]);
      setPeriods(periodRows);
      setAvs(data);
      setMsg('Supabase実データを表示しています');
    })().catch((error) => setMsg((error as Error).message));
  }, []);
  useEffect(() => {
    const closePanel = () => setPanelPosition(null);
    window.addEventListener('resize', closePanel);
    window.addEventListener('orientationchange', closePanel);
    return () => {
      window.removeEventListener('resize', closePanel);
      window.removeEventListener('orientationchange', closePanel);
    };
  }, []);

  function updateLocal(workDate: string, status: AvailabilityStatus, note = avs.find((a) => a.work_date === workDate && a.staff_id === profile?.id)?.note ?? '') {
    if (!profile) return;
    setAvs((current) => upsertLocalAvailability(current, profile.id, profile.company_id, workDate, status, note));
  }

  function openPanel(workDate: string, element: HTMLButtonElement) {
    setSelectedDate(workDate);
    const rect = element.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
    const left = clamp(rect.left + rect.width / 2 - width / 2, PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= PANEL_HEIGHT + 88
      ? rect.bottom + 8
      : Math.max(PANEL_MARGIN, rect.top - PANEL_HEIGHT - 8);
    setPanelPosition({ top, left });
  }

  async function saveAll() {
    if (!profile) { setMsg('プロフィールが見つかりません。管理者に確認してください。'); return; }
    const rows = avs.filter((a) => a.staff_id === profile.id).map(({ company_id, work_date, status, note }) => ({ company_id, work_date, status, note, staff_id: profile.id }));
    try { await upsertAvailabilities(rows); setMsg('保存しました'); setPanelPosition(null); } catch (error) { setMsg(`${(error as Error).message}（画面上のみ更新しました）`); }
  }

  return (
    <div className="overflow-x-hidden">
      <PageHeader title="予定提出" description="調整さんのように、案件ごとではなく日付ごとに勤務可否をまとめて登録します。未入力日は不可扱いです。" />
      {msg && <div className="mb-4"><Badge tone="blue">{msg}</Badge></div>}
      <Card className="mb-4 p-4"><div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:w-fit">{(['monthly','weekly'] as AvailabilityPeriodType[]).map((type) => <Button key={type} variant={periodType === type ? 'primary' : 'ghost'} onClick={() => { setPeriodType(type); setPanelPosition(null); }}>{periodTypeLabel(type)}</Button>)}</div><div className={`mb-4 rounded-2xl border p-4 ${isAfterDeadline ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-100 bg-blue-50 text-blue-900'}`}><p className="font-bold">{period.period_type === 'monthly' ? `${formatPeriodLabel(period)}の勤務可能日は ${formatDateTimeJa(period.deadline)} までに提出してください` : `${formatPeriodLabel(period)} の勤務可能日を ${formatDateTimeJa(period.deadline)} までに提出してください`}</p>{isAfterDeadline && <p className="mt-1 text-sm font-semibold">締切後です。今回は警告のみ表示し、編集は可能です。</p>}</div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{periodType === 'monthly' ? monthLabel(month) : `${formatPeriodLabel(period)} の勤務可能日を提出`}</h2>
            <p className="text-sm text-slate-500">日付をタップして ○ △ × を入力できます</p>
          </div>
          {periodType === 'monthly' && <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex">
            <Button variant="secondary" onClick={() => { setMonth(addMonths(month, -1)); setPanelPosition(null); }}>前月</Button>
            <Input type="month" value={toMonthInput(month)} onChange={(e) => { setMonth(new Date(`${e.target.value}-01`)); setPanelPosition(null); }} className="w-36" />
            <Button variant="secondary" onClick={() => { setMonth(addMonths(month, 1)); setPanelPosition(null); }}>翌月</Button>
          </div>}
        </div>
      </Card>
      {periodType === 'monthly' ? <Card className="p-2 sm:p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 sm:gap-2">{['日','月','火','水','木','金','土'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const av = avs.find((a) => a.work_date === day.date && a.staff_id === profile?.id);
            const opt = options.find((o) => o.value === (av?.status ?? 'unavailable'))!;
            const inMonth = day.month === month.getMonth();
            const isSelected = selectedDate === day.date && panelPosition;
            return <button key={day.date} onClick={(event) => openPanel(day.date, event.currentTarget)} className={`min-h-20 rounded-2xl border p-1 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-28 sm:p-2 ${inMonth ? opt.cellClassName : 'border-slate-100 bg-slate-50 text-slate-300'} ${isSelected ? 'relative z-10 scale-[1.02] ring-4 ring-blue-400 ring-offset-2' : ''}`}>
              <div className="flex items-center justify-between gap-1"><span className="text-sm font-bold sm:text-base">{day.day}</span><span className={`min-w-8 rounded-full border px-2 py-1 text-center text-lg font-black leading-none ${opt.className}`}>{opt.mark}</span></div>
              {av?.note && <p className="mt-2 hidden line-clamp-2 text-xs text-slate-500 sm:block">{av.note}</p>}
            </button>;
          })}
        </div>
      </Card> : <Card className="p-4"><div className="grid gap-3 sm:grid-cols-7">{weekDays.map((day) => { const av = avs.find((a) => a.work_date === day.date && a.staff_id === profile?.id); const opt = options.find((o) => o.value === (av?.status ?? 'unavailable'))!; return <button key={day.date} onClick={(event) => openPanel(day.date, event.currentTarget)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${opt.cellClassName}`}><p className="text-xs font-bold text-slate-400">{day.weekday}</p><div className="mt-2 flex items-center justify-between"><span className="text-lg font-bold text-slate-950">{day.label}</span><span className={`rounded-full border px-3 py-1 text-xl font-black ${opt.className}`}>{opt.mark}</span></div>{av?.note && <p className="mt-2 text-xs text-slate-500">{av.note}</p>}</button>; })}</div></Card>}
      {panelPosition && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="fixed bottom-0 left-0 right-0 w-full rounded-t-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/70 pointer-events-auto sm:absolute sm:w-[calc(100vw-24px)] sm:max-w-[344px] sm:rounded-3xl" style={typeof window !== 'undefined' && window.innerWidth >= 640 ? { top: panelPosition.top, left: panelPosition.left } : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400">選択中の日付</p>
                <h2 className="text-lg font-bold text-slate-950">{selectedDate}</h2>
              </div>
              <button type="button" onClick={() => setPanelPosition(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500">閉じる</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {options.map((o) => {
                const active = (selected?.status ?? 'unavailable') === o.value;
                return <button key={o.value} type="button" onClick={() => updateLocal(selectedDate, o.value)} className={`min-h-20 rounded-2xl border p-2 text-center shadow-lg transition active:scale-95 ${active ? o.activeClassName : `${o.className} shadow-slate-100`}`}>
                  <span className="block text-3xl font-black leading-none">{o.mark}</span>
                  <span className="mt-2 block text-xs font-bold">{o.label}</span>
                </button>;
              })}
            </div>
            <Input className="mt-4 min-h-12" placeholder="メモ（例：午前のみ可能）" value={selected?.note ?? ''} onChange={(e) => updateLocal(selectedDate, selected?.status ?? 'conditional', e.target.value)} />
            <Button className="mt-4 min-h-12 w-full rounded-2xl" onClick={saveAll}>保存</Button>
          </div>
        </div>
      )}
    </div>
  );
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
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function upsertLocalAvailability(current: Availability[], staffId: string, companyId: string, workDate: string, status: AvailabilityStatus, note: string) {
  const existing = current.find((a) => a.work_date === workDate && a.staff_id === staffId);
  if (existing) return current.map((a) => (a.id === existing.id ? { ...a, status, note } : a));
  return [...current, { id: `availability-${staffId}-${workDate}`, company_id: companyId || mockCompany.id, staff_id: staffId, work_date: workDate, status, note, created_at: new Date().toISOString() }];
}
