'use client';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { MonthlyCalendarDownload, PressableShiftCard, ShiftDetailSheet, type ShiftRow } from '@/components/staffShiftUi';
import { getCurrentStaffProfile, listCurrentStaffShiftRows } from '@/lib/staffAuth';

type Row = ShiftRow;
const wd = ['日', '月', '火', '水', '木', '金', '土'];

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('ログイン中スタッフ本人のシフトを表示しています');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { profile, message } = await getCurrentStaffProfile();
      if (!profile) { setMsg(message ?? 'ログイン情報を確認できません。再ログインしてください。'); return; }
      const { data, error } = await listCurrentStaffShiftRows(profile.id);
      if (error) setMsg(error.message);
      else { setRows((data ?? []) as unknown as Row[]); setMsg('Supabaseの確定シフトからICSを生成できます'); }
    })();
  }, []);
  const firstShift = rows[0]?.projects?.work_date;
  const base = firstShift ? new Date(`${firstShift}T00:00:00`) : new Date();
  const y = base.getFullYear();
  const m = base.getMonth();
  const days = useMemo(() => {
    const first = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)] as (number | null)[];
  }, [y, m]);
  const dateKey = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const byDate = (d: string) => rows.filter((r) => r.projects?.work_date === d);
  const selectedDateRows = selectedDate ? byDate(selectedDate) : [];

  return <div><PageHeader title="カレンダー" description="シフト日をタップすると、その日の予定一覧と詳細を確認できます。" />
    <MonthlyCalendarDownload rows={rows} />
    {msg && <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{msg}</p>}
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="text-xl font-bold">{y}年 {m + 1}月</h2><Badge tone="blue">My Shift</Badge></div><div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-semibold text-slate-500">{wd.map((x) => <div className="py-2" key={x}>{x}</div>)}</div><div className="grid grid-cols-7">{days.map((d, i) => {
      const key = d ? dateKey(d) : '';
      const shifts = d ? byDate(key) : [];
      const hasShifts = shifts.length > 0;
      return <button type="button" key={i} disabled={!hasShifts} onClick={() => setSelectedDate(key)} className={`min-h-20 border-t border-r border-slate-100 p-1.5 text-left transition sm:min-h-28 sm:p-2 ${hasShifts ? 'bg-white hover:bg-blue-50 active:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-200' : 'cursor-default bg-white'}`}>{d && <><div className={`mb-1 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${hasShifts ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{d}</div><div className="space-y-1">{shifts.slice(0, 2).map((r) => <div key={r.id} className="truncate rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-100 sm:text-xs">{r.projects?.start_time} {r.projects?.title}</div>)}{shifts.length > 2 && <p className="text-[10px] font-bold text-blue-600">+{shifts.length - 2}件</p>}</div></>}</button>;
    })}</div></Card>
    <ResponsiveEditor open={!!selectedDate && !selectedShift} title={selectedDate ?? ''} subtitle={`${selectedDateRows.length}件のシフト`} onClose={() => setSelectedDate(null)}>
      <div className="space-y-3">{selectedDateRows.map((r) => <PressableShiftCard key={r.id} row={r} compact onClick={() => setSelectedShift(r)} />)}</div>
    </ResponsiveEditor>
    <ShiftDetailSheet row={selectedShift} open={!!selectedShift} onClose={() => setSelectedShift(null)} />
  </div>;
}
