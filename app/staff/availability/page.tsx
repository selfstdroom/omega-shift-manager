'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { DEMO_USER } from '@/lib/demo';
import { mockAvailabilities, mockCompany } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Availability, AvailabilityStatus } from '@/lib/types';

const options: { value: AvailabilityStatus; mark: string; label: string; className: string }[] = [
  { value: 'available', mark: '○', label: '勤務可能', className: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'conditional', mark: '△', label: '条件付き', className: 'border-orange-200 bg-orange-50 text-orange-700' },
  { value: 'unavailable', mark: '×', label: '不可', className: 'border-slate-200 bg-slate-100 text-slate-500' },
];

const fmt = (date: Date) => date.toISOString().slice(0, 10);
const monthLabel = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
const toMonthInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function Page() {
  const [month, setMonth] = useState(() => new Date('2026-06-01'));
  const [avs, setAvs] = useState<Availability[]>(mockAvailabilities.filter((a) => a.staff_id === DEMO_USER.id));
  const [selectedDate, setSelectedDate] = useState(fmt(new Date('2026-06-20')));
  const [msg, setMsg] = useState('デモスタッフとして表示しています');

  const days = useMemo(() => buildCalendarDays(month), [month]);
  const selected = avs.find((a) => a.work_date === selectedDate && a.staff_id === DEMO_USER.id);

  async function load() {
    const s = getSupabaseBrowserClient();
    if (!s) return;
    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const { data, error } = await s.from('availabilities').select('*').eq('staff_id', currentUser.id);
    if (error || !data?.length) {
      setMsg(`${error?.message ?? 'Supabaseデータなし'}（デモデータを表示しています）`);
      return;
    }
    setAvs(data as Availability[]);
    setMsg(user ? '' : 'デモスタッフとして表示しています');
  }

  useEffect(() => { load(); }, []);

  function updateLocal(workDate: string, status: AvailabilityStatus, note = avs.find((a) => a.work_date === workDate && a.staff_id === DEMO_USER.id)?.note ?? '') {
    setAvs((current) => upsertLocalAvailability(current, workDate, status, note));
  }

  async function saveAll() {
    const s = getSupabaseBrowserClient();
    if (!s) { setMsg('Supabase未接続のため画面上のみ更新しました'); return; }
    const { data: { user } } = await s.auth.getUser();
    const currentUser = user ?? DEMO_USER;
    const rows = avs.filter((a) => a.staff_id === DEMO_USER.id).map(({ company_id, work_date, status, note }) => ({ company_id, work_date, status, note, staff_id: currentUser.id }));
    const { error } = await s.from('availabilities').upsert(rows, { onConflict: 'staff_id,work_date' });
    setMsg(error ? `${error.message}（画面上のみ更新しました）` : '保存しました');
  }

  return (
    <div>
      <PageHeader title="予定提出" description="調整さんのように、案件ごとではなく日付ごとに勤務可否をまとめて登録します。未入力日は不可扱いです。" />
      {msg && <div className="mb-4"><Badge tone="blue">{msg}</Badge></div>}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{monthLabel(month)}</h2>
            <p className="text-sm text-slate-500">○ 勤務可能 / △ 条件付き / × 不可</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>前月</Button>
            <Input type="month" value={toMonthInput(month)} onChange={(e) => setMonth(new Date(`${e.target.value}-01`))} className="w-36" />
            <Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>翌月</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 sm:gap-2">{['日','月','火','水','木','金','土'].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day) => {
              const av = avs.find((a) => a.work_date === day.date && a.staff_id === DEMO_USER.id);
              const opt = options.find((o) => o.value === (av?.status ?? 'unavailable'))!;
              const inMonth = day.month === month.getMonth();
              return <button key={day.date} onClick={() => setSelectedDate(day.date)} className={`min-h-20 rounded-2xl border p-1 text-left transition sm:min-h-28 sm:p-2 ${inMonth ? 'bg-white' : 'bg-slate-50 text-slate-300'} ${selectedDate === day.date ? 'ring-2 ring-blue-500' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between"><span className="text-sm font-bold">{day.day}</span><span className={`rounded-full px-2 py-1 text-lg font-black ${opt.className}`}>{opt.mark}</span></div>
                {av?.note && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{av.note}</p>}
              </button>;
            })}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold text-slate-950">{selectedDate} の予定</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {options.map((o) => <Button key={o.value} variant={(selected?.status ?? 'unavailable') === o.value ? 'primary' : 'secondary'} className="min-h-14 px-2 text-lg" onClick={() => updateLocal(selectedDate, o.value)}>{o.mark}</Button>)}
          </div>
          <Input className="mt-4" placeholder="メモ（例：午前のみ可能）" value={selected?.note ?? ''} onChange={(e) => updateLocal(selectedDate, selected?.status ?? 'conditional', e.target.value)} />
          <Button className="mt-5 min-h-12 w-full" onClick={saveAll}>一括保存</Button>
        </Card>
      </div>
    </div>
  );
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { date: fmt(d), day: d.getDate(), month: d.getMonth() }; });
}
function addMonths(date: Date, diff: number) { return new Date(date.getFullYear(), date.getMonth() + diff, 1); }
function upsertLocalAvailability(current: Availability[], workDate: string, status: AvailabilityStatus, note: string) {
  const existing = current.find((a) => a.work_date === workDate && a.staff_id === DEMO_USER.id);
  if (existing) return current.map((a) => (a.id === existing.id ? { ...a, status, note } : a));
  return [...current, { id: `demo-${workDate}`, company_id: mockCompany.id, staff_id: DEMO_USER.id, work_date: workDate, status, note, created_at: new Date().toISOString() }];
}
