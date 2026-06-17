'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { SectionCard } from '@/components/ui/SectionCard';
import { formatDateTimeJa, formatPeriodLabel, getActivePeriod, getPeriodDateRange, periodTypeLabel } from '@/lib/availabilityPeriods';
import { mockAvailabilityPeriods, mockCompany } from '@/lib/mockData';
import { closeAvailabilityPeriods, listAvailabilityPeriods, saveAvailabilityPeriod } from '@/lib/repositories/availabilityRepository';
import type { AvailabilityPeriod, AvailabilityPeriodType } from '@/lib/types';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const pad = (value: number) => String(value).padStart(2, '0');
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const monthValue = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

type WeeklyPreview = { start: string; end: string; deadline: string };

export default function AdminSettingsPage() {
  const [periodType, setPeriodType] = useState<AvailabilityPeriodType>('monthly');
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(mockAvailabilityPeriods);
  const [targetMonth, setTargetMonth] = useState('2026-07');
  const [monthlyDeadlineDate, setMonthlyDeadlineDate] = useState('2026-06-25');
  const [monthlyDeadlineTime, setMonthlyDeadlineTime] = useState('18:00');
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [weekEndDay, setWeekEndDay] = useState(0);
  const [deadlineWeekOffset, setDeadlineWeekOffset] = useState(-1);
  const [deadlineWeekday, setDeadlineWeekday] = useState(5);
  const [weeklyDeadlineTime, setWeeklyDeadlineTime] = useState('18:00');
  const [msg, setMsg] = useState('提出ルールを読み込み中です。');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await listAvailabilityPeriods();
      setPeriods(rows);
      hydrateFromPeriods(rows);
      setMsg('現在の提出ルールを表示しています。');
    })().catch((error) => setMsg((error as Error).message));
  }, []);

  const activePeriod = useMemo(() => getActivePeriod(periods, periodType), [periods, periodType]);
  const weeklyPreview = useMemo(() => buildWeeklyPreview(weekStartDay, weekEndDay, deadlineWeekOffset, deadlineWeekday, weeklyDeadlineTime), [weekStartDay, weekEndDay, deadlineWeekOffset, deadlineWeekday, weeklyDeadlineTime]);
  const monthlyDeadline = `${monthlyDeadlineDate}T${monthlyDeadlineTime}:00`;

  function hydrateFromPeriods(rows: AvailabilityPeriod[]) {
    const monthly = getActivePeriod(rows, 'monthly');
    if (monthly?.target_month) setTargetMonth(monthly.target_month);
    if (monthly?.deadline) { setMonthlyDeadlineDate(monthly.deadline.slice(0, 10)); setMonthlyDeadlineTime(monthly.deadline.slice(11, 16)); }
    const weekly = getActivePeriod(rows, 'weekly');
    if (weekly?.week_start_date && weekly?.week_end_date) {
      const start = new Date(`${weekly.week_start_date}T00:00:00`);
      const end = new Date(`${weekly.week_end_date}T00:00:00`);
      const deadline = new Date(weekly.deadline);
      setWeekStartDay(start.getDay()); setWeekEndDay(end.getDay()); setDeadlineWeekday(deadline.getDay()); setWeeklyDeadlineTime(weekly.deadline.slice(11, 16));
      setDeadlineWeekOffset(Math.round((startOfWeek(deadline, start.getDay()).getTime() - startOfWeek(start, start.getDay()).getTime()) / 604800000));
    }
  }

  async function saveRule() {
    setIsSaving(true);
    const period = periodType === 'monthly'
      ? { company_id: mockCompany.id, period_type: 'monthly' as const, target_month: targetMonth, week_start_date: null, week_end_date: null, deadline: monthlyDeadline, status: 'open' as const }
      : { company_id: mockCompany.id, period_type: 'weekly' as const, target_month: null, week_start_date: weeklyPreview.start, week_end_date: weeklyPreview.end, deadline: weeklyPreview.deadline, status: 'open' as const };
    try {
      const saved = await saveAvailabilityPeriod(period);
      await closeAvailabilityPeriods(periodType, saved.id);
      setPeriods((current) => [saved, ...current.filter((p) => p.id !== saved.id).map((p) => (p.period_type === periodType ? { ...p, status: 'closed' as const } : p))]);
      setMsg(`${periodTypeLabel(periodType)}の提出ルールを保存しました。`);
    } catch (error) {
      setMsg(`${(error as Error).message}（保存できませんでした）`);
    } finally {
      setIsSaving(false);
    }
  }

  return <div><PageHeader title="設定" description="勤務可能日の提出対象期間と締切を会社の運用に合わせて設定できます。" />{msg && <div className="mb-4"><Badge tone="blue">{msg}</Badge></div>}
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-5"><div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:w-fit">{(['monthly','weekly'] as AvailabilityPeriodType[]).map((type) => <Button key={type} variant={periodType === type ? 'primary' : 'ghost'} onClick={() => setPeriodType(type)}>{periodTypeLabel(type)}</Button>)}</div>
        {periodType === 'monthly' ? <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold text-slate-700">対象月<Input type="month" className="mt-1" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} /></label><label className="text-sm font-bold text-slate-700">締切日<Input type="date" className="mt-1" value={monthlyDeadlineDate} onChange={(e) => setMonthlyDeadlineDate(e.target.value)} /></label><label className="text-sm font-bold text-slate-700">締切時刻<Input type="time" className="mt-1" value={monthlyDeadlineTime} onChange={(e) => setMonthlyDeadlineTime(e.target.value)} /></label></div>
        : <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">対象週開始曜日<Select className="mt-1" value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))}>{weekdays.map((day, index) => <option key={day} value={index}>{day}曜</option>)}</Select></label><label className="text-sm font-bold text-slate-700">対象週終了曜日<Select className="mt-1" value={weekEndDay} onChange={(e) => setWeekEndDay(Number(e.target.value))}>{weekdays.map((day, index) => <option key={day} value={index}>{day}曜</option>)}</Select></label><label className="text-sm font-bold text-slate-700">締切週<Select className="mt-1" value={deadlineWeekOffset} onChange={(e) => setDeadlineWeekOffset(Number(e.target.value))}><option value={-1}>前週</option><option value={0}>対象週</option></Select></label><label className="text-sm font-bold text-slate-700">締切曜日<Select className="mt-1" value={deadlineWeekday} onChange={(e) => setDeadlineWeekday(Number(e.target.value))}>{weekdays.map((day, index) => <option key={day} value={index}>{day}曜</option>)}</Select></label><label className="text-sm font-bold text-slate-700">締切時刻<Input type="time" className="mt-1" value={weeklyDeadlineTime} onChange={(e) => setWeeklyDeadlineTime(e.target.value)} /></label></div>}
        <div className="mt-6 flex justify-end"><Button onClick={saveRule} disabled={isSaving}>{isSaving ? '保存中...' : '提出ルールを保存'}</Button></div></Card>
      <SectionCard title="プレビュー" description="スタッフ画面と管理者ダッシュボードに表示される内容です。"><div className="space-y-3 text-sm font-semibold text-slate-700"><p>提出方式：{periodTypeLabel(periodType)}</p><p>対象：{periodType === 'monthly' ? `${Number(targetMonth.split('-')[1])}月分` : `${formatShort(weeklyPreview.start)}〜${formatShort(weeklyPreview.end)}`}</p><p>提出期限：{periodType === 'monthly' ? formatDateTimeJa(monthlyDeadline) : formatDateTimeJa(weeklyPreview.deadline)}</p><p className="rounded-2xl bg-blue-50 p-3 text-blue-900">{periodType === 'monthly' ? `${Number(targetMonth.split('-')[1])}月分の勤務可能日を入力してください` : `${formatShort(weeklyPreview.start)}〜${formatShort(weeklyPreview.end)} の勤務可能日を入力してください`}</p></div></SectionCard>
    </div>
    <SectionCard className="mt-6" title="現在の提出ルール"><p className="font-bold text-slate-900">{periodTypeLabel(activePeriod.period_type)}：{formatPeriodLabel(activePeriod)}</p><p className="text-sm font-semibold text-slate-500">対象期間 {getPeriodDateRange(activePeriod).start}〜{getPeriodDateRange(activePeriod).end} / 締切 {formatDateTimeJa(activePeriod.deadline)}</p></SectionCard>
  </div>;
}

function buildWeeklyPreview(startDay: number, endDay: number, deadlineOffset: number, deadlineDay: number, deadlineTime: string): WeeklyPreview {
  const now = new Date();
  const start = startOfWeek(now, startDay); if (dateOnly(start) < dateOnly(now)) start.setDate(start.getDate() + 7);
  const end = new Date(start); end.setDate(start.getDate() + ((endDay - startDay + 7) % 7));
  const deadlineBase = new Date(start); deadlineBase.setDate(start.getDate() + deadlineOffset * 7 + ((deadlineDay - startDay + 7) % 7));
  return { start: dateOnly(start), end: dateOnly(end), deadline: `${dateOnly(deadlineBase)}T${deadlineTime}:00` };
}
function startOfWeek(date: Date, startDay: number) { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() - startDay + 7) % 7)); return d; }
function formatShort(value: string) { const d = new Date(`${value}T00:00:00`); return `${d.getMonth() + 1}/${d.getDate()}`; }
