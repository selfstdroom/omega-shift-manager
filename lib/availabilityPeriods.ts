import type { Availability, AvailabilityPeriod, AvailabilityPeriodType, Profile } from '@/lib/types';

export const dateOnly = (value: string) => value.slice(0, 10);
export const toDate = (value: string) => new Date(value.includes('T') ? value : `${value}T00:00:00`);
export const formatDateTimeJa = (value: string) => {
  const d = toDate(value);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const formatPeriodLabel = (period: AvailabilityPeriod) => {
  if (period.period_type === 'monthly') {
    const [year, month] = (period.target_month ?? '').split('-');
    return year && month ? `${Number(month)}月分` : '月次期間';
  }
  return `${formatShortDate(period.week_start_date ?? '')}〜${formatShortDate(period.week_end_date ?? '')}`;
};
export const formatShortDate = (value: string) => {
  const d = toDate(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
export const getPeriodDateRange = (period: AvailabilityPeriod) => {
  if (period.period_type === 'weekly') return { start: period.week_start_date ?? '', end: period.week_end_date ?? '' };
  const [year, month] = (period.target_month ?? '').split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  return { start, end: dateOnly(endDate.toISOString()) };
};
export const getSubmissionStats = (period: AvailabilityPeriod, profiles: Profile[], availabilities: Availability[]) => {
  const staff = profiles.filter((p) => p.role === 'staff');
  const { start, end } = getPeriodDateRange(period);
  const submittedIds = new Set(availabilities.filter((a) => a.work_date >= start && a.work_date <= end).map((a) => a.staff_id));
  const submitted = staff.filter((p) => submittedIds.has(p.id));
  const unsubmitted = staff.filter((p) => !submittedIds.has(p.id));
  const rate = staff.length ? Math.round((submitted.length / staff.length) * 100) : 0;
  return { staff, submitted, unsubmitted, rate, submittedCount: submitted.length, unsubmittedCount: unsubmitted.length };
};
export const getDaysUntilDeadline = (deadline: string, now = new Date()) => Math.ceil((toDate(deadline).getTime() - now.getTime()) / 86400000);
export const getActivePeriod = (periods: AvailabilityPeriod[], type: AvailabilityPeriodType) => periods.find((p) => p.period_type === type && p.status === 'open') ?? periods.find((p) => p.period_type === type) ?? periods[0];
export const getCurrentSubmissionPeriod = (periods: AvailabilityPeriod[]) => periods.filter((p) => p.status === 'open').sort((a, b) => toDate(a.deadline).getTime() - toDate(b.deadline).getTime())[0] ?? periods[0];
export const periodTypeLabel = (type: AvailabilityPeriodType) => type === 'monthly' ? '月単位' : '週単位';
