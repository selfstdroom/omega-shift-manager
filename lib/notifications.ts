import { demoStaff, getDemoAssignments } from '@/lib/demo';
import { mockCompany, mockProfiles, mockProjects } from '@/lib/mockData';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { Assignment, Notification, Profile, Project } from '@/lib/types';

export const NOTIFICATION_STORAGE_KEY = 'omega-demo-notifications';

export type AssignmentNotificationInput = {
  assignments: Assignment[];
  projects: Project[];
  profiles?: Profile[];
};

const formatDate = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
};

export const buildShiftNotificationMessage = (project: Project, assignment: Assignment) => [
  `${formatDate(project.work_date)} ${project.start_time}〜${project.end_time}`,
  project.location || project.title,
  `役割：${assignment.is_leader ? 'リーダー' : 'スタッフ'}`,
].join('\n');

export const buildShiftNotifications = ({ assignments, projects }: AssignmentNotificationInput): Notification[] => {
  const createdAt = new Date().toISOString();
  return assignments.reduce<Notification[]>((notifications, assignment) => {
    const project = projects.find((p) => p.id === assignment.project_id);
    if (!project) return notifications;
    notifications.push({
      id: `notification-${assignment.project_id}-${assignment.staff_id}-${Date.now()}`,
      company_id: assignment.company_id,
      staff_id: assignment.staff_id,
      title: 'シフトが確定しました',
      message: buildShiftNotificationMessage(project, assignment),
      type: 'shift_confirmed',
      project_id: project.id,
      assignment_id: assignment.id,
      is_read: false,
      created_at: createdAt,
    });
    return notifications;
  }, []);
};

export const seedDemoNotifications = (): Notification[] => buildShiftNotifications({
  assignments: getDemoAssignments().filter((a) => a.staff_id === demoStaff.id).slice(0, 2).map((a) => ({ ...a, status: 'confirmed' })),
  projects: mockProjects,
});

export const readLocalNotifications = (): Notification[] => {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!stored) {
    const seeded = seedDemoNotifications();
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(stored) as Notification[];
  } catch {
    return [];
  }
};

export const writeLocalNotifications = (notifications: Notification[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
};

export const appendLocalNotifications = (notifications: Notification[]) => {
  const current = readLocalNotifications();
  const deduped = notifications.filter((next) => !current.some((item) => item.staff_id === next.staff_id && item.type === next.type && item.message === next.message));
  writeLocalNotifications([...deduped, ...current]);
  return deduped.length;
};

export const createShiftConfirmedNotifications = async (input: AssignmentNotificationInput) => {
  const notifications = buildShiftNotifications(input);
  const insertedLocalCount = appendLocalNotifications(notifications);
  const supabase = getSupabaseBrowserClient();
  if (supabase && notifications.length > 0) {
    await supabase.from('notifications').insert(notifications.map(({ id: _id, ...notification }) => notification));
  }
  return { notifications, insertedLocalCount };
};

export const getStaffNotifications = async (staffId = demoStaff.id) => {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.from('notifications').select('*').eq('staff_id', staffId).order('created_at', { ascending: false });
    if (data?.length) return data as Notification[];
  }
  return readLocalNotifications().filter((n) => n.staff_id === staffId || n.staff_id === demoStaff.id);
};

export const markNotificationRead = async (id: string) => {
  const current = readLocalNotifications();
  writeLocalNotifications(current.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  const supabase = getSupabaseBrowserClient();
  if (supabase) await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const getProfileName = (staffId: string) => mockProfiles.find((p) => p.id === staffId)?.name ?? staffId;
export const getCompanyId = () => mockCompany.id;
