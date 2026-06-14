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

export function PressableShiftCard({ row, label, onClick, compact = false, inverted = false }: { row: ShiftRow; label?: string; onClick: () => void; compact?: boolean; inverted?: boolean }) {
  const p = row.projects;
  if (!p) return null;
  const base = inverted
    ? 'border-white/15 bg-white/10 text-white shadow-lg hover:bg-white/15 active:bg-white/20 focus:ring-white/40'
    : 'border-slate-200 bg-white text-slate-950 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md active:translate-y-0 active:bg-blue-50 focus:ring-blue-200';
  return (
    <button type="button" onClick={onClick} className={`group w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 ${compact ? 'min-h-[96px]' : 'min-h-[128px]'} ${base}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && <p className={`mb-2 text-xs font-bold ${inverted ? 'text-blue-100' : 'text-blue-600'}`}>{label}</p>}
          <p className="truncate text-base font-bold">{p.title}</p>
          <p className={`mt-1 text-sm ${inverted ? 'text-blue-100' : 'text-slate-600'}`}>{p.work_date} {p.start_time}-{p.end_time}</p>
          <p className={`text-sm ${inverted ? 'text-blue-100' : 'text-slate-600'}`}>📍 {p.location}</p>
        </div>
        {row.is_leader && <Badge tone="blue">Leader</Badge>}
      </div>
      <div className={`mt-4 flex items-center justify-between text-sm font-bold ${inverted ? 'text-white' : 'text-blue-700'}`}>
        <span>詳細を見る</span><span className="transition group-hover:translate-x-1">→</span>
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
        <Info label="案件名" value={p.title} />
        <div className="grid grid-cols-2 gap-3"><Info label="勤務日" value={p.work_date} /><Info label="役割" value={row.is_leader ? 'リーダー' : demoStaff.staff_role === 'leader' ? 'スタッフ（リーダー候補）' : 'スタッフ'} /></div>
        <div className="grid grid-cols-2 gap-3"><Info label="開始時間" value={p.start_time} /><Info label="終了時間" value={p.end_time} /></div>
        <Info label="勤務場所" value={p.location} />
        <Info label="事業所" value={workplaceName(row)} />
        <Info label="リーダー" value={row.is_leader ? 'はい' : 'いいえ'} />
        <Info label="備考" value={p.note || '備考なし'} />
        <a href={getGoogleCalendarUrl(row)} target="_blank" rel="noreferrer" className="block pt-2"><Button className="w-full">Googleカレンダーに追加</Button></a>
      </div>}
    </ResponsiveEditor>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 break-words font-bold text-slate-900">{value}</p></div>;
}
