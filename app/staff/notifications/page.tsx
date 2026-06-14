'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { demoStaff } from '@/lib/demo';
import { getStaffNotifications, markNotificationRead, readLocalNotifications, writeLocalNotifications } from '@/lib/notifications';
import type { Notification } from '@/lib/types';

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = () => getStaffNotifications(demoStaff.id).then((data) => {
    const sorted = [...data].sort((a, b) => b.created_at.localeCompare(a.created_at));
    setItems(sorted);
    setSelected((current) => current ? sorted.find((item) => item.id === current.id) ?? null : sorted[0] ?? null);
  });

  useEffect(() => { void load(); }, []);

  const unread = useMemo(() => items.filter((item) => !item.is_read), [items]);
  const read = useMemo(() => items.filter((item) => item.is_read), [items]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const markAllRead = async () => {
    writeLocalNotifications(readLocalNotifications().map((item) => item.staff_id === demoStaff.id ? { ...item, is_read: true } : item));
    await load();
  };

  return (
    <div>
      <PageHeader title="通知" description="確定したシフトなど、Webアプリ内のお知らせを確認できます。" actions={unread.length > 0 ? <Button variant="secondary" onClick={markAllRead}>すべて既読</Button> : undefined} />
      <Card className="mb-4 bg-gradient-to-r from-blue-600 to-slate-900 p-5 text-white">
        <p className="text-sm font-bold text-blue-100">未読通知</p>
        <p className="mt-1 text-3xl font-black">{unread.length}件</p>
        <p className="mt-2 text-sm font-semibold text-blue-100">LINE通知ではなく、アプリ内のお知らせとして表示します。</p>
      </Card>
      {items.length === 0 ? <EmptyState title="通知はありません" description="シフトが確定されると、ここにお知らせが届きます。" /> : <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="space-y-5">
          <NotificationGroup title="未読通知" items={unread} selectedId={selected?.id} onSelect={setSelected} />
          <NotificationGroup title="既読通知" items={read} selectedId={selected?.id} onSelect={setSelected} muted />
        </section>
        <section className="sticky top-4 h-fit rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          {selected ? <div>
            <div className="flex items-center justify-between gap-2"><Badge tone={selected.is_read ? 'slate' : 'blue'}>{selected.is_read ? '既読' : '未読'}</Badge><span className="text-xs font-bold text-slate-400">{new Date(selected.created_at).toLocaleString('ja-JP')}</span></div>
            <h2 className="mt-4 text-xl font-black text-slate-950">{selected.title}</h2>
            <p className="mt-4 whitespace-pre-line rounded-3xl bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">{selected.message}</p>
            {!selected.is_read && <Button className="mt-5 w-full rounded-2xl" onClick={() => markRead(selected.id)}>既読にする</Button>}
          </div> : <p className="text-sm font-bold text-slate-400">通知を選択してください。</p>}
        </section>
      </div>}
    </div>
  );
}

function NotificationGroup({ title, items, selectedId, muted, onSelect }: { title: string; items: Notification[]; selectedId?: string; muted?: boolean; onSelect: (item: Notification) => void }) {
  return <div><h2 className="mb-3 text-sm font-black text-slate-500">{title}</h2><div className="space-y-3">{items.length === 0 ? <p className="rounded-3xl bg-white p-5 text-center text-sm font-bold text-slate-400 ring-1 ring-slate-100">該当する通知はありません。</p> : items.map((item) => <button key={item.id} onClick={() => onSelect(item)} className={`w-full rounded-3xl p-4 text-left shadow-sm ring-1 transition ${selectedId === item.id ? 'ring-blue-300' : 'ring-slate-100'} ${muted ? 'bg-slate-50 opacity-70' : 'bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className={`font-black ${item.is_read ? 'text-slate-500' : 'text-slate-950'}`}>{item.title}</p><p className="mt-2 line-clamp-2 whitespace-pre-line text-sm font-semibold text-slate-500">{item.message}</p></div>{!item.is_read && <span className="mt-1 h-3 w-3 rounded-full bg-blue-500" />}</div></button>)}</div></div>;
}
