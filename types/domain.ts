export type UserRole = 'admin' | 'staff';
export type StaffRole = 'staff' | 'leader';
export type AvailabilityStatus = 'available' | 'conditional' | 'unavailable';
export type AssignmentStatus = 'draft' | 'confirmed';

export type Company = { id: string; name: string; created_at: string };
export type Workplace = { id: string; company_id: string; name: string; address: string; created_at: string };
export type Profile = { id: string; company_id: string; workplace_id: string; name: string; role: UserRole; staff_role: StaffRole; phone: string; created_at: string };
export type Project = { id: string; company_id: string; workplace_id: string; title: string; work_date: string; start_time: string; end_time: string; location: string; required_people: number; required_leaders: number; note: string; created_at: string };
export type Availability = { id: string; company_id: string; project_id: string; staff_id: string; status: AvailabilityStatus; note: string; created_at: string };
export type AssignmentRun = { id: string; company_id: string; executed_by: string; created_at: string };
export type Assignment = { id: string; company_id: string; project_id: string; staff_id: string; run_id: string; status: AssignmentStatus; is_leader: boolean; created_at: string };

export type AssignmentWarning = 'リーダー不足' | '人数不足';
export type AssignmentResult = { project: Project; assignments: Assignment[]; warnings: AssignmentWarning[] };
