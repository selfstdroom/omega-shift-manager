import type { Assignment, Availability, Company, Profile, Project, Workplace } from '@/lib/types';

const now = '2026-06-13T00:00:00.000Z';

export const mockCompany: Company = {
  id: 'company-omega',
  name: 'オメガテクノ',
  created_at: now,
};

export const mockWorkplaces: Workplace[] = [
  { id: 'wp-1', company_id: mockCompany.id, name: '東京事業所', address: '東京都千代田区', created_at: now },
  { id: 'wp-2', company_id: mockCompany.id, name: '横浜事業所', address: '神奈川県横浜市', created_at: now },
];

export const mockProfiles: Profile[] = [
  { id: 'admin-1', company_id: mockCompany.id, workplace_id: 'wp-1', name: '管理者 太郎', role: 'admin', staff_role: 'leader', phone: '090-0000-0001', created_at: now },
  { id: 'staff-1', company_id: mockCompany.id, workplace_id: 'wp-1', name: '佐藤 リーダー', role: 'staff', staff_role: 'leader', phone: '090-0000-0002', created_at: now },
  { id: 'staff-2', company_id: mockCompany.id, workplace_id: 'wp-1', name: '鈴木 スタッフ', role: 'staff', staff_role: 'staff', phone: '090-0000-0003', created_at: now },
  { id: 'staff-3', company_id: mockCompany.id, workplace_id: 'wp-2', name: '高橋 リーダー', role: 'staff', staff_role: 'leader', phone: '090-0000-0004', created_at: now },
  { id: 'staff-4', company_id: mockCompany.id, workplace_id: 'wp-2', name: '田中 スタッフ', role: 'staff', staff_role: 'staff', phone: '090-0000-0005', created_at: now },
  { id: 'staff-5', company_id: mockCompany.id, workplace_id: 'wp-1', name: '伊藤 スタッフ', role: 'staff', staff_role: 'staff', phone: '090-0000-0006', created_at: now },
];

export const mockProjects: Project[] = [
  { id: 'project-1', company_id: mockCompany.id, workplace_id: 'wp-1', title: '倉庫棚卸サポート', work_date: '2026-07-01', start_time: '09:00', end_time: '17:00', location: '東京倉庫', required_people: 3, required_leaders: 1, note: 'available優先・conditional補完のデモ', created_at: now },
  { id: 'project-2', company_id: mockCompany.id, workplace_id: 'wp-2', title: '夜間搬入作業', work_date: '2026-07-01', start_time: '16:00', end_time: '22:00', location: '横浜センター', required_people: 2, required_leaders: 1, note: 'project-1と時間が重なるため同一スタッフは除外', created_at: now },
  { id: 'project-3', company_id: mockCompany.id, workplace_id: 'wp-1', title: 'イベント設営', work_date: '2026-07-02', start_time: '08:00', end_time: '12:00', location: '幕張', required_people: 4, required_leaders: 2, note: 'リーダー不足・人数不足警告のデモ', created_at: now },
];

export const mockAvailabilities: Availability[] = [
  { id: 'av-1', company_id: mockCompany.id, project_id: 'project-1', staff_id: 'staff-1', status: 'available', note: '', created_at: now },
  { id: 'av-2', company_id: mockCompany.id, project_id: 'project-1', staff_id: 'staff-2', status: 'available', note: '', created_at: now },
  { id: 'av-3', company_id: mockCompany.id, project_id: 'project-1', staff_id: 'staff-4', status: 'conditional', note: '午前に別予定あり', created_at: now },
  { id: 'av-4', company_id: mockCompany.id, project_id: 'project-1', staff_id: 'staff-5', status: 'unavailable', note: '終日不可', created_at: now },
  { id: 'av-5', company_id: mockCompany.id, project_id: 'project-2', staff_id: 'staff-1', status: 'available', note: 'project-1配置済みなら重複除外', created_at: now },
  { id: 'av-6', company_id: mockCompany.id, project_id: 'project-2', staff_id: 'staff-2', status: 'available', note: 'project-1配置済みなら重複除外', created_at: now },
  { id: 'av-7', company_id: mockCompany.id, project_id: 'project-2', staff_id: 'staff-3', status: 'available', note: '', created_at: now },
  { id: 'av-8', company_id: mockCompany.id, project_id: 'project-2', staff_id: 'staff-5', status: 'available', note: '', created_at: now },
  { id: 'av-9', company_id: mockCompany.id, project_id: 'project-3', staff_id: 'staff-1', status: 'available', note: '', created_at: now },
  { id: 'av-10', company_id: mockCompany.id, project_id: 'project-3', staff_id: 'staff-2', status: 'conditional', note: '午後予定あり', created_at: now },
  { id: 'av-11', company_id: mockCompany.id, project_id: 'project-3', staff_id: 'staff-3', status: 'unavailable', note: '休暇', created_at: now },
];

export const mockPreviousAssignments: Assignment[] = [
  { id: 'old-1', company_id: mockCompany.id, project_id: 'old-project-1', staff_id: 'staff-1', run_id: 'old-run', status: 'confirmed', is_leader: true, created_at: now },
  { id: 'old-2', company_id: mockCompany.id, project_id: 'old-project-2', staff_id: 'staff-1', run_id: 'old-run', status: 'confirmed', is_leader: true, created_at: now },
  { id: 'old-3', company_id: mockCompany.id, project_id: 'old-project-3', staff_id: 'staff-2', run_id: 'old-run', status: 'confirmed', is_leader: false, created_at: now },
];
