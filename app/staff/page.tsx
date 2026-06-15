'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { NavCard } from '@/components/NavCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyShiftCard, PressableShiftCard, ShiftDetailSheet, type ShiftRow } from '@/components/staffShiftUi';
import { getCurrentStaffProfile, listCurrentStaffShiftRows } from '@/lib/staffAuth';
import { listNotifications } from '@/lib/repositories/notificationRepository';
import type { Profile } from '@/lib/types';

type Row = ShiftRow;

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    (async () => {
      const { profile: currentProfile, message } = await getCurrentStaffProfile();
      if (!currentProfile) { setMsg(message ?? 'ログイン情報を確認できません。再ログインしてください。'); return; }
      setProfile(currentProfile);
      const [{ data, error }, notifications] = await Promise.all([listCurrentStaffShiftRows(currentProfile.id), listNotifications(currentProfile.id)]);
      if (error) setMsg(error.message); else setRows((data ?? []) as unknown as Row[]);
      setUnreadCount(notifications.filter((item) => !item.is_read).length);
    })();
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const confirmedRows = useMemo(() => rows.filter((r) => r.status === 'confirmed'), [rows]);
  const sorted = useMemo(() => [...confirmedRows].sort((a, b) => (a.projects?.work_date ?? '').localeCompare(b.projects?.work_date ?? '')), [confirmedRows]);
  const todayShift = sorted.find((r) => r.projects?.work_date === today);
  const nextShift = sorted.find((r) => (r.projects?.work_date ?? '') >= today) ?? sorted[0];
  const month = today.slice(0, 7);
  const monthCount = confirmedRows.filter((r) => r.projects?.work_date?.startsWith(month)).length;
  return <div><div className="mb-5 flex items-start justify-between gap-3"><PageHeader title={profile ? `こんにちは、${profile.name}さん` : 'スタッフ画面'} description={msg || 'ログイン中スタッフ本人のシフトを表示しています。'} /><Link href="/staff/notifications" className="relative grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-white text-2xl shadow-sm ring-1 ring-slate-100" aria-label="通知">🔔{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1 text-xs font-black text-white ring-2 ring-white">{unreadCount}</span>}</Link></div>
    <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-slate-900 p-4 text-white shadow-lg sm:p-6">
      {nextShift?.projects ? <PressableShiftCard row={nextShift} label="次回シフト" onClick={() => setSelected(nextShift)} inverted /> : <div><p className="text-sm font-semibold text-blue-100">次回シフト</p><p className="mt-3">予定はありません</p></div>}
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      {todayShift ? <PressableShiftCard label="今日のシフト" row={todayShift} onClick={() => setSelected(todayShift)} /> : <EmptyShiftCard title="今日のシフト" />}
      {nextShift ? <PressableShiftCard label="次回シフト" row={nextShift} onClick={() => setSelected(nextShift)} /> : <EmptyShiftCard title="次回シフト" />}
      <StatCard label="今月の確定シフト数" value={monthCount} tone="blue" />
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><NavCard href="/staff/notifications" title={`通知（未読${unreadCount}件）`} description="確定シフトのお知らせ" /><NavCard href="/staff/availability" title="勤務可能日登録" description="予定登録へ進む" /><NavCard href="/staff/shifts" title="シフト一覧" description="割当済み案件を確認" /><NavCard href="/staff/calendar" title="カレンダー" description="月表示で確認" /></div>
    <ShiftDetailSheet row={selected} open={!!selected} onClose={() => setSelected(null)} />
  </div>;
}
