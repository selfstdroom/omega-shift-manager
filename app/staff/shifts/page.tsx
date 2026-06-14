'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PressableShiftCard, ShiftDetailSheet, type ShiftRow } from '@/components/staffShiftUi';
import { DEMO_USER, getDemoShiftRows } from '@/lib/demo';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

type Row = ShiftRow;

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const s = getSupabaseBrowserClient();
      if (!s) {
        setRows(getDemoShiftRows());
        setMsg('Supabase未接続のためデモデータを表示しています');
        return;
      }

      const { data: { user } } = await s.auth.getUser();
      const currentUser = user ?? DEMO_USER;
      const { data, error } = await s
        .from('assignments')
        .select('id,company_id,project_id,staff_id,run_id,status,is_leader,created_at,projects(id,company_id,workplace_id,title,work_date,start_time,end_time,location,required_people,required_leaders,note,created_at)')
        .eq('staff_id', currentUser.id);

      if (error) {
        setRows(getDemoShiftRows());
        setMsg(`${error.message}（デモデータを表示しています）`);
      } else {
        setRows((data?.length ? data : getDemoShiftRows()) as unknown as Row[]);
        setMsg(user ? '' : 'デモスタッフとして表示しています');
      }
    })();
  }, []);

  const sorted = useMemo(() => [...rows].sort((a, b) => (a.projects?.work_date ?? '').localeCompare(b.projects?.work_date ?? '')), [rows]);
  const confirmed = sorted.filter((r) => r.status === 'confirmed');
  const draft = sorted.filter((r) => r.status !== 'confirmed');

  return <div><PageHeader title="シフト" description="確定シフトを大きく表示しています。未確定は下部で薄く確認できます。" />{msg && <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{msg}</p>}
    <section className="space-y-3"><h2 className="text-sm font-black text-blue-700">確定シフト</h2>{confirmed.map((r) => <PressableShiftCard key={r.id} row={r} onClick={() => setSelected(r)} />)}{confirmed.length === 0 && <p className="rounded-3xl bg-white p-5 text-center text-sm font-bold text-slate-400 ring-1 ring-slate-100">確定シフトはまだありません。</p>}</section>
    <section className="mt-7 space-y-3"><h2 className="text-sm font-black text-slate-400">未確定</h2>{draft.map((r) => <PressableShiftCard key={r.id} row={r} onClick={() => setSelected(r)} />)}{draft.length === 0 && <p className="rounded-3xl bg-white p-5 text-center text-sm font-bold text-slate-400 ring-1 ring-slate-100">未確定シフトはありません。</p>}</section>
    <ShiftDetailSheet row={selected} open={!!selected} onClose={() => setSelected(null)} /></div>;
}
