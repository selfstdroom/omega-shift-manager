'use client';

import { useEffect, useState } from 'react';
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
        setRows((data ?? []) as unknown as Row[]);
        setMsg(user ? '' : 'デモスタッフとして表示しています');
      }
    })();
  }, []);

  return <div><PageHeader title="シフト" description="配置済みの案件一覧です。カードをタップすると詳細を確認できます。" />{msg && <p className="mb-3 text-red-700">{msg}</p>}<div className="space-y-3">{rows.map((r) => <PressableShiftCard key={r.id} row={r} onClick={() => setSelected(r)} />)}</div><ShiftDetailSheet row={selected} open={!!selected} onClose={() => setSelected(null)} /></div>;
}
