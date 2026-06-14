'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ResponsiveEditor } from '@/components/ui/ResponsiveEditor';
import { demoStaff } from '@/lib/demo';
import { mockWorkplaces } from '@/lib/mockData';
import type { Assignment, Project } from '@/lib/types';

export type ShiftRow = Assignment & { projects: Project | null };

export function getGoogleCalendarUrl(row: ShiftRow) {
  const p = row.projects;
  if (!p) return '#';
  const day = p.work_date.replaceAll('-', '');
  const start = `${day}T${p.start_time.replace(':', '')}00`;
  const end = `${day}T${p.end_time.replace(':', '')}00`;
  const details = [`役割: ${row.is_leader ? 'リーダー' : 'スタッフ'}`, p.note ? `備考: ${p.note}` : ''].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.title)}&dates=${start}/${end}&location=${encodeURIComponent(p.location)}&details=${encodeURIComponent(details)}`;
}

export function workplaceName(row: ShiftRow) {
  const workplace = mockWorkplaces.find((w) => w.id === row.projects?.workplace_id);
  return workplace?.name ?? '未設定';
}

export function roleLabel(row: ShiftRow) {
  return row.is_leader ? 'リーダー' : demoStaff.staff_role === 'leader' ? 'スタッフ（リーダー候補）' : 'スタッフ';
}

export function PressableShiftCard({ row, label, onClick, compact = false, inverted = false }: { row: ShiftRow; label?: string; onClick: () => void; compact?: boolean; inverted?: boolean }) {
  const p = row.projects;
  if (!p) return null;
  const confirmed = row.status === 'confirmed';
  const base = inverted
    ? 'border-white/15 bg-white/10 text-white shadow-lg hover:bg-white/15 active:bg-white/20 focus:ring-white/40'
    : confirmed
      ? 'border-blue-200 bg-white text-slate-950 shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:translate-y-0 active:bg-blue-50 focus:ring-blue-200'
      : 'border-slate-100 bg-slate-50 text-slate-500 opacity-75 hover:bg-slate-100 active:bg-slate-100 focus:ring-slate-200';
  return (
    <button type="button" onClick={onClick} className={`group w-full rounded-3xl border p-4 text-left transition focus:outline-none focus:ring-4 ${compact ? 'min-h-[96px]' : 'min-h-[132px]'} ${base}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && <p className={`mb-2 text-xs font-black ${inverted ? 'text-blue-100' : confirmed ? 'text-blue-600' : 'text-slate-400'}`}>{label}</p>}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={confirmed ? 'blue' : 'slate'}>{confirmed ? '確定シフト' : '未確定'}</Badge>
            {row.is_leader && <Badge tone="green">Leader</Badge>}
          </div>
          <p className="truncate text-lg font-black">{p.title}</p>
          <p className={`mt-2 text-base font-black ${inverted ? 'text-white' : confirmed ? 'text-slate-900' : 'text-slate-500'}`}>⏰ {p.work_date} {p.start_time}-{p.end_time}</p>
          <p className={`mt-1 text-sm font-bold ${inverted ? 'text-blue-100' : 'text-slate-600'}`}>📍 {p.location}</p>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-blue-700 shadow-sm ring-1 ring-blue-100">開く →</span>
      </div>
    </button>
  );
}

export function EmptyShiftCard({ title }: { title: string }) {
  return <Card className="min-h-[128px] p-5"><Badge tone="green">{title}</Badge><p className="mt-4 text-sm text-slate-500">予定はありません</p></Card>;
}

export function ShiftDetailSheet({ row, open, onClose }: { row: ShiftRow | null; open: boolean; onClose: () => void }) {
  const p = row?.projects;
  return (
    <ResponsiveEditor open={open} title={p?.title ?? ''} subtitle="シフト詳細" onClose={onClose}>
      {row && p && <div className="space-y-3">
        <div className="rounded-3xl bg-blue-50 p-5 ring-1 ring-blue-100"><Badge tone={row.status === 'confirmed' ? 'blue' : 'slate'}>{row.status === 'confirmed' ? '確定シフト' : '未確定'}</Badge><p className="mt-3 text-2xl font-black text-slate-950">{p.work_date}</p><p className="text-xl font-black text-blue-700">{p.start_time} - {p.end_time}</p><p className="mt-2 text-base font-bold text-slate-700">📍 {p.location}</p></div>
        <Info label="案件名" value={p.title} />
        <div className="grid grid-cols-2 gap-3"><Info label="勤務日" value={p.work_date} /><Info label="自分の役割" value={roleLabel(row)} /></div>
        <div className="grid grid-cols-2 gap-3"><Info label="開始時間" value={p.start_time} /><Info label="終了時間" value={p.end_time} /></div>
        <Info label="勤務場所" value={p.location} />
        <Info label="事業所" value={workplaceName(row)} />
        <Info label="備考" value={p.note || '備考なし'} />
        <a href={getGoogleCalendarUrl(row)} target="_blank" rel="noreferrer" className="block pt-2"><Button className="w-full">Googleカレンダーに追加</Button></a>
      </div>}
    </ResponsiveEditor>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 break-words font-bold text-slate-900">{value}</p></div>;
}
