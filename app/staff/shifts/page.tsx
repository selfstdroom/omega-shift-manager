'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { DEMO_USER, getDemoShiftRows } from '@/lib/demo';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

type Row = ReturnType<typeof getDemoShiftRows>[number];

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
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
        .select('id,is_leader,projects(title,work_date,start_time,end_time,location)')
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

  return <div><PageHeader title="シフト" description="配置済みの案件一覧です。" />{msg && <p className="text-red-700">{msg}</p>}<div className="space-y-3">{rows.map((r) => <Card className="p-4" key={r.id}><div className="flex items-start justify-between gap-3"><div><b>{r.projects?.title}</b><p className="mt-1 text-sm text-slate-600">{r.projects?.work_date} {r.projects?.start_time}-{r.projects?.end_time}</p><p className="text-sm text-slate-600">{r.projects?.location}</p></div>{r.is_leader && <Badge tone="blue">Leader</Badge>}</div></Card>)}</div></div>;
}
