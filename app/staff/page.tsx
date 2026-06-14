'use client';
import { useMemo, useState } from 'react';
import { NavCard } from '@/components/NavCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyShiftCard, PressableShiftCard, ShiftDetailSheet, type ShiftRow } from '@/components/staffShiftUi';
import { demoStaff, getDemoShiftRows } from '@/lib/demo';

type Row = ShiftRow;

export default function Page() {
  const [rows] = useState<Row[]>(getDemoShiftRows());
  const [selected, setSelected] = useState<Row | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const sorted = useMemo(() => [...rows].sort((a, b) => (a.projects?.work_date ?? '').localeCompare(b.projects?.work_date ?? '')), [rows]);
  const todayShift = sorted.find((r) => r.projects?.work_date === today);
  const nextShift = sorted.find((r) => (r.projects?.work_date ?? '') >= today) ?? sorted[0];
  const month = today.slice(0, 7);
  const monthCount = rows.filter((r) => r.projects?.work_date?.startsWith(month)).length;
  return <div><PageHeader title={`こんにちは、${demoStaff.name}さん`} description="デモスタッフとしてログインなしで操作できます。" />
    <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-slate-900 p-4 text-white shadow-lg sm:p-6">
      {nextShift?.projects ? <PressableShiftCard row={nextShift} label="次回シフト" onClick={() => setSelected(nextShift)} inverted /> : <div><p className="text-sm font-semibold text-blue-100">次回シフト</p><p className="mt-3">予定はありません</p></div>}
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      {todayShift ? <PressableShiftCard label="今日のシフト" row={todayShift} onClick={() => setSelected(todayShift)} /> : <EmptyShiftCard title="今日のシフト" />}
      {nextShift ? <PressableShiftCard label="次回シフト" row={nextShift} onClick={() => setSelected(nextShift)} /> : <EmptyShiftCard title="次回シフト" />}
      <StatCard label="今月の勤務数" value={monthCount} tone="blue" />
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><NavCard href="/staff/availability" title="勤務可能日登録" description="予定登録へ進む" /><NavCard href="/staff/shifts" title="シフト一覧" description="割当済み案件を確認" /><NavCard href="/staff/calendar" title="カレンダー" description="月表示で確認" /></div>
    <ShiftDetailSheet row={selected} open={!!selected} onClose={() => setSelected(null)} />
  </div>;
}
