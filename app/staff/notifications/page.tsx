'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { getGoogleCalendarUrl, roleLabel, type ShiftRow } from '@/components/staffShiftUi';
import { demoStaff, getDemoShiftRows } from '@/lib/demo';
import { getStaffNotifications, markNotificationRead, readLocalNotifications, writeLocalNotifications } from '@/lib/notifications';
import type { Notification } from '@/lib/types';

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Notification | null>(null);
  const shifts = useMemo(() => getDemoShiftRows(), []);

  const load = () => getStaffNotifications(demoStaff.id).then((data) => {
    const sorted = [...data].sort((a, b) => b.created_at.localeCompare(a.created_at));
    setItems(sorted);
  });

  useEffect(() => { void load(); }, []);

  const unread = useMemo(() => items.filter((item) => !item.is_read), [items]);
  const read = useMemo(() => items.filter((item) => item.is_read), [items]);
  const selectedShift = selected ? findShiftForNotification(selected, shifts) : null;

  const openNotification = async (item: Notification) => {
    setSelected(item);
    if (!item.is_read) {
      await markNotificationRead(item.id);
      await load();
      setSelected({ ...item, is_read: true });
    }
  };

  const markAllRead = async () => {
    writeLocalNotifications(readLocalNotifications().map((item) => item.staff_id === demoStaff.id ? { ...item, is_read: true } : item));
    await load();
    setSelected((current) => current ? { ...current, is_read: true } : current);
  };

  return (
    <div>
      <PageHeader title="通知" description="通知をタップすると、確定シフトの詳細確認とGoogleカレンダー追加ができます。" actions={unread.length > 0 ? <Button variant="secondary" onClick={markAllRead}>すべて既読</Button> : undefined} />
      <Card className="mb-5 bg-gradient-to-r from-blue-600 to-slate-900 p-6 text-white">
        <p className="text-sm font-black text-blue-100">未読通知</p>
        <p className="mt-1 text-4xl font-black">{unread.length}件</p>
        <p className="mt-2 text-sm font-semibold text-blue-100">新しい通知から自分の確定シフトをすぐ確認できます。</p>
      </Card>
      {items.length === 0 ? <EmptyState title="通知はありません" description="シフトが確定されると、ここにお知らせが届きます。" /> : <section className="space-y-6">
        <NotificationGroup title="未読通知" items={unread} selectedId={selected?.id} onSelect={openNotification} />
        <NotificationGroup title="既読通知" items={read} selectedId={selected?.id} onSelect={openNotification} muted />
      </section>}
      <NotificationDetail notification={selected} shift={selectedShift} onClose={() => setSelected(null)} />
    </div>
  );
}

function findShiftForNotification(notification: Notification, shifts: ShiftRow[]) {
  return shifts.find((shift) => shift.id === notification.assignment_id)
    ?? shifts.find((shift) => shift.project_id === notification.project_id)
    ?? shifts.find((shift) => notification.message.includes(shift.projects?.title ?? '') || notification.message.includes(shift.projects?.location ?? ''))
    ?? null;
}

function NotificationDetail({ notification, shift, onClose }: { notification: Notification | null; shift: ShiftRow | null; onClose: () => void }) {
  const p = shift?.projects;
  return <ResponsiveEditor open={!!notification} title={notification?.title ?? ''} subtitle="通知詳細" onClose={onClose}>
    {notification && <div className="space-y-3">
      <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100">
        <Badge tone="blue">確定シフト通知</Badge>
        <h2 className="mt-3 text-2xl font-black text-slate-950">{notification.title}</h2>
        <p className="mt-3 whitespace-pre-line text-base font-bold leading-7 text-slate-700">{notification.message}</p>
      </div>
      <Info label="案件名" value={p?.title ?? '対象シフトを確認中'} />
      <div className="grid grid-cols-2 gap-3"><Info label="勤務日" value={p?.work_date ?? '-'} /><Info label="自分の役割" value={shift ? roleLabel(shift) : '-'} /></div>
      <div className="grid grid-cols-2 gap-3"><Info label="開始時間" value={p?.start_time ?? '-'} /><Info label="終了時間" value={p?.end_time ?? '-'} /></div>
      <Info label="勤務場所" value={p?.location ?? '-'} />
      <Info label="備考" value={p?.note || '備考なし'} />
      {shift && <a href={getGoogleCalendarUrl(shift)} target="_blank" rel="noreferrer" className="block pt-2"><Button className="w-full">Googleカレンダーに追加</Button></a>}
    </div>}
  </ResponsiveEditor>;
}

function NotificationGroup({ title, items, selectedId, muted, onSelect }: { title: string; items: Notification[]; selectedId?: string; muted?: boolean; onSelect: (item: Notification) => void }) {
  return <div><h2 className="mb-3 text-sm font-black text-slate-500">{title}</h2><div className="space-y-3">{items.length === 0 ? <p className="rounded-3xl bg-white p-5 text-center text-sm font-bold text-slate-400 ring-1 ring-slate-100">該当する通知はありません。</p> : items.map((item) => <button key={item.id} onClick={() => onSelect(item)} className={`group w-full rounded-3xl p-5 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${selectedId === item.id ? 'ring-blue-300' : 'ring-slate-100'} ${muted ? 'bg-slate-50 opacity-75' : 'bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-lg font-black ${item.is_read ? 'text-slate-500' : 'text-slate-950'}`}>{item.title}</p><p className="mt-2 line-clamp-2 whitespace-pre-line text-sm font-bold leading-6 text-slate-500">{item.message}</p><p className="mt-3 text-sm font-black text-blue-700">詳細を開く →</p></div>{!item.is_read && <span className="mt-1 h-3 w-3 rounded-full bg-blue-500" />}</div></button>)}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 break-words font-bold text-slate-900">{value}</p></div>;
}
