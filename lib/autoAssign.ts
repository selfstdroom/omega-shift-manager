import type { Assignment, AssignmentResult, Availability, Profile, Project } from '@/types/domain';

type AutoAssignInput = { companyId: string; executedBy: string; projects: Project[]; profiles: Profile[]; availabilities: Availability[]; previousAssignments?: Assignment[]; runId?: string };
const overlaps = (a: Project, b: Project) => a.work_date === b.work_date && a.start_time < b.end_time && b.start_time < a.end_time;

export function autoAssign(input: AutoAssignInput): AssignmentResult[] {
  const runId = input.runId ?? `run-${Date.now()}`;
  const counts = new Map<string, number>();
  input.previousAssignments?.forEach((a) => counts.set(a.staff_id, (counts.get(a.staff_id) ?? 0) + 1));
  const assignedByStaff = new Map<string, Project[]>();

  return [...input.projects].sort((a, b) => `${a.work_date} ${a.start_time}`.localeCompare(`${b.work_date} ${b.start_time}`)).map((project) => {
    const availabilityByStaff = new Map(input.availabilities.filter((a) => a.project_id === project.id && a.status !== 'unavailable').map((a) => [a.staff_id, a]));
    const candidates = input.profiles
      .filter((p) => p.role === 'staff' && p.company_id === project.company_id && availabilityByStaff.has(p.id))
      .filter((p) => !(assignedByStaff.get(p.id) ?? []).some((assignedProject) => overlaps(project, assignedProject)))
      .sort((a, b) => {
        const avA = availabilityByStaff.get(a.id)!.status === 'available' ? 0 : 1;
        const avB = availabilityByStaff.get(b.id)!.status === 'available' ? 0 : 1;
        return avA - avB || (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.created_at.localeCompare(b.created_at);
      });

    const picked: Profile[] = [];
    const pick = (pool: Profile[], limit: number) => {
      for (const staff of pool) {
        if (picked.length >= limit) break;
        if (!picked.some((p) => p.id === staff.id)) picked.push(staff);
      }
    };

    pick(candidates.filter((p) => p.staff_role === 'leader'), project.required_leaders);
    pick(candidates, project.required_people);

    const assignments = picked.map<Assignment>((staff) => ({
      id: `${runId}-${project.id}-${staff.id}`,
      company_id: input.companyId,
      project_id: project.id,
      staff_id: staff.id,
      run_id: runId,
      status: 'draft',
      is_leader: staff.staff_role === 'leader',
      created_at: new Date().toISOString(),
    }));

    picked.forEach((staff) => {
      counts.set(staff.id, (counts.get(staff.id) ?? 0) + 1);
      assignedByStaff.set(staff.id, [...(assignedByStaff.get(staff.id) ?? []), project]);
    });

    const leaderCount = assignments.filter((a) => a.is_leader).length;
    const warnings: AssignmentResult['warnings'] = [];
    if (leaderCount < project.required_leaders) warnings.push('リーダー不足');
    if (assignments.length < project.required_people) warnings.push('人数不足');
    return { project, assignments, warnings };
  });
}
