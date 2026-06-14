import type { Assignment, Project } from '@/lib/types';

export type CalendarShiftRow = Assignment & { projects: Project | null };

const pad = (value: number) => String(value).padStart(2, '0');

const escapeIcsText = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const toLocalDateTime = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

const nowStamp = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
};

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function getShiftMonthKey(row: CalendarShiftRow) {
  return row.projects?.work_date.slice(0, 7) ?? '';
}

export function getConfirmedMonthlyShiftRows(rows: CalendarShiftRow[], monthKey: string) {
  return rows
    .filter((row) => row.status === 'confirmed' && row.projects?.work_date.startsWith(monthKey))
    .sort((a, b) => {
      const aProject = a.projects;
      const bProject = b.projects;
      return `${aProject?.work_date ?? ''} ${aProject?.start_time ?? ''}`.localeCompare(`${bProject?.work_date ?? ''} ${bProject?.start_time ?? ''}`);
    });
}

export function buildMonthlyShiftIcs(rows: CalendarShiftRow[], monthKey: string) {
  const stamp = nowStamp();
  const events = getConfirmedMonthlyShiftRows(rows, monthKey).flatMap((row) => {
    const project = row.projects;
    if (!project) return [];

    const role = row.is_leader ? 'リーダー' : 'スタッフ';
    const description = [`役割: ${role}`, project.note ? `備考: ${project.note}` : '備考: 備考なし'].join('\n');

    return [
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`omega-shift-${row.id}-${project.id}@omega-shift-manager`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toLocalDateTime(project.work_date, project.start_time)}`,
      `DTEND:${toLocalDateTime(project.work_date, project.end_time)}`,
      `SUMMARY:${escapeIcsText(project.title)}`,
      `LOCATION:${escapeIcsText(project.location)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `CATEGORIES:${escapeIcsText(role)}`,
      'END:VEVENT',
    ];
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Omega Shift Manager//Staff Monthly Shifts//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Omega Shift',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function getMonthlyShiftIcsFileName(monthKey: string) {
  return `omega-shift-${monthKey}.ics`;
}
