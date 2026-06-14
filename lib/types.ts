export type UserRole = 'admin' | 'staff';
export type StaffRole = 'staff' | 'leader';
export type AvailabilityStatus = 'available' | 'conditional' | 'unavailable';
export type AvailabilityPeriodType = 'monthly' | 'weekly';
export type AvailabilityPeriodStatus = 'open' | 'closed';
export type AssignmentStatus = 'draft' | 'confirmed';
export type NotificationType = 'shift_confirmed' | 'system';
export type ProjectType = 'single' | 'recurring';

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type Workplace = {
  id: string;
  company_id: string;
  name: string;
  address: string;
  created_at: string;
};

export type Profile = {
  id: string;
  company_id: string;
  workplace_id: string;
  name: string;
  role: UserRole;
  staff_role: StaffRole;
  phone: string;
  note?: string | null;
  created_at: string;
};

export type ProjectTemplate = {
  id: string;
  company_id: string;
  workplace_id: string;
  template_name: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  required_people: number;
  required_leaders?: number | null;
  note: string;
  weekdays: number[];
  created_at: string;
};

export type Project = {
  id: string;
  company_id: string;
  workplace_id: string;
  title: string;
  project_type: ProjectType;
  work_date: string;
  start_time: string;
  end_time: string;
  location: string;
  required_people: number;
  required_leaders?: number | null;
  note: string;
  created_at: string;
};

export type ProjectDay = {
  id: string;
  project_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  required_people: number;
  required_leaders?: number | null;
  note: string;
  created_at: string;
};

export type ProjectWorkDay = ProjectDay & {
  company_id: string;
  workplace_id: string;
  title: string;
  location: string;
  project_type: ProjectType;
};

export type AvailabilityPeriod = {
  id: string;
  company_id: string;
  period_type: AvailabilityPeriodType;
  target_month?: string | null;
  week_start_date?: string | null;
  week_end_date?: string | null;
  deadline: string;
  status: AvailabilityPeriodStatus;
  created_at: string;
};

export type Availability = {
  id: string;
  company_id: string;
  staff_id: string;
  work_date: string;
  status: AvailabilityStatus;
  note: string;
  created_at: string;
};

export type AssignmentRun = {
  id: string;
  company_id: string;
  executed_by: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  company_id: string;
  project_id: string;
  staff_id: string;
  run_id: string;
  status: AssignmentStatus;
  is_leader: boolean;
  created_at: string;
};

export type AssignmentWarning = 'リーダー不足' | '人数不足';

export type AssignmentResult = {
  project: ProjectWorkDay;
  assignments: Assignment[];
  warnings: AssignmentWarning[];
};

export type AutoAssignInput = {
  companyId: string;
  executedBy: string;
  projects: ProjectWorkDay[];
  profiles: Profile[];
  availabilities: Availability[];
  previousAssignments?: Assignment[];
  runId?: string;
};

export type Notification = {
  id: string;
  company_id: string;
  staff_id: string;
  title: string;
  message: string;
  type: NotificationType;
  project_id?: string | null;
  assignment_id?: string | null;
  is_read: boolean;
  created_at: string;
};
