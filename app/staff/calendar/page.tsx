'use client';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { getDemoShiftRows } from '@/lib/demo';

type Row = ReturnType<typeof getDemoShiftRows>[number];
const wd = ['日', '月', '火', '水', '木', '金', '土'];

export default function Page() {
  const [rows] = useState<Row[]>(getDemoShiftRows());
  const firstShift = rows[0]?.projects?.work_date;
  const base = firstShift ? new Date(`${firstShift}T00:00:00`) : new Date();
  const y = base.getFullYear();
  const m = base.getMonth();
  const days = useMemo(() => {
    const first = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)] as (number | null)[];
  }, [y, m]);
  const byDate = (d: number) => rows.filter((r) => r.projects?.work_date === `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const selected = rows[0];

  return <div><PageHeader title="カレンダー" description="Googleカレンダー / TimeTree風にシフト日を視覚表示します。" /><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="text-xl font-bold">{y}年 {m + 1}月</h2><Badge tone="blue">Demo Shift</Badge></div><div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-semibold text-slate-500">{wd.map((x) => <div className="py-2" key={x}>{x}</div>)}</div><div className="grid grid-cols-7">{days.map((d, i) => {
    const shifts = d ? byDate(d) : [];
    return <div key={i} className="min-h-20 border-t border-r border-slate-100 p-1.5 sm:min-h-28 sm:p-2">{d && <><div className={`mb-1 grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${shifts.length ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{d}</div><div className="space-y-1">{shifts.slice(0, 2).map((r) => <div key={r.id} className="truncate rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 sm:text-xs">{r.projects?.start_time} {r.projects?.title}</div>)}</div></>}</div>;
  })}</div></Card>{selected?.projects && <Card className="mt-5 p-5"><Badge tone="green">予定詳細</Badge><h3 className="mt-3 text-lg font-bold">{selected.projects.title}</h3><p className="mt-1 text-sm text-slate-600">{selected.projects.work_date} {selected.projects.start_time}-{selected.projects.end_time}</p><p className="text-sm text-slate-600">{selected.projects.location}</p></Card>}</div>;
}
