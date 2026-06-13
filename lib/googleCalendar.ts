import type { Project } from '@/types/domain';

const compactDateTime = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

export function googleCalendarUrl(project: Project) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: project.title,
    dates: `${compactDateTime(project.work_date, project.start_time)}/${compactDateTime(project.work_date, project.end_time)}`,
    location: project.location,
    details: project.note || 'Omega Shift Manager から作成',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
