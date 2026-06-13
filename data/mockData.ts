import type { Availability, Company, Profile, Project, Workplace } from '@/types/domain';

const now = new Date().toISOString();
export const mockCompany: Company = { id: 'company-omega', name: 'オメガテクノ', created_at: now };
export const mockWorkplaces: Workplace[] = [
  { id: 'wp-1', company_id: mockCompany.id, name: '本社', address: '東京都千代田区丸の内1-1-1', created_at: now },
  { id: 'wp-2', company_id: mockCompany.id, name: '茨城営業所', address: '茨城県水戸市中央1-1-1', created_at: now },
];
const staffNames = ['佐藤 リーダー', '鈴木 リーダー', '高橋 リーダー', '田中 スタッフ', '伊藤 スタッフ', '渡辺 スタッフ', '山本 スタッフ', '中村 スタッフ', '小林 スタッフ', '加藤 スタッフ'];
export const mockProfiles: Profile[] = [
  { id: 'admin-1', company_id: mockCompany.id, workplace_id: 'wp-1', name: '管理者 太郎', role: 'admin', staff_role: 'leader', phone: '090-0000-0001', created_at: now },
  ...staffNames.map((name, index): Profile => ({ id: `staff-${index + 1}`, company_id: mockCompany.id, workplace_id: index % 2 === 0 ? 'wp-1' : 'wp-2', name, role: 'staff', staff_role: index < 3 ? 'leader' : 'staff', phone: `090-1000-00${String(index + 2).padStart(2, '0')}`, created_at: now })),
];
export const mockProjects: Project[] = [
  { id: 'project-1', company_id: mockCompany.id, workplace_id: 'wp-1', title: '本社 倉庫棚卸サポート', work_date: '2026-07-01', start_time: '09:00', end_time: '17:00', location: '本社倉庫', required_people: 4, required_leaders: 1, note: '安全靴必須', created_at: now },
  { id: 'project-2', company_id: mockCompany.id, workplace_id: 'wp-2', title: '茨城 夜間搬入作業', work_date: '2026-07-01', start_time: '16:00', end_time: '22:00', location: '水戸物流センター', required_people: 3, required_leaders: 1, note: '車通勤可', created_at: now },
  { id: 'project-3', company_id: mockCompany.id, workplace_id: 'wp-1', title: 'イベント設営', work_date: '2026-07-02', start_time: '08:00', end_time: '12:00', location: '幕張メッセ', required_people: 5, required_leaders: 2, note: 'リーダー2名体制', created_at: now },
  { id: 'project-4', company_id: mockCompany.id, workplace_id: 'wp-2', title: '工場ライン応援', work_date: '2026-07-03', start_time: '10:00', end_time: '18:00', location: 'ひたちなか工場', required_people: 4, required_leaders: 1, note: '', created_at: now },
  { id: 'project-5', company_id: mockCompany.id, workplace_id: 'wp-1', title: '早朝検品', work_date: '2026-07-03', start_time: '06:00', end_time: '10:00', location: '本社配送口', required_people: 2, required_leaders: 1, note: '早朝手当対象', created_at: now },
];
export const mockAvailabilities: Availability[] = mockProjects.flatMap((project, projectIndex) =>
  mockProfiles.filter((p) => p.role === 'staff').map((staff, staffIndex): Availability => {
    const unavailable = (projectIndex + staffIndex) % 7 === 0;
    const conditional = !unavailable && (projectIndex + staffIndex) % 4 === 0;
    return { id: `av-${project.id}-${staff.id}`, company_id: mockCompany.id, project_id: project.id, staff_id: staff.id, status: unavailable ? 'unavailable' : conditional ? 'conditional' : 'available', note: conditional ? '時間相談可' : '', created_at: now };
  }),
);
