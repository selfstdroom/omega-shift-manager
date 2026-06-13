import type { Assignment, AssignmentResult, Availability, Profile, Project } from '@/types/domain';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type AutoAssignInput = {
  companyId: string;
  executedBy: string;
  projects: Project[];
  profiles: Profile[];
  availabilities: Availability[];
  previousAssignments?: Assignment[];
  runId?: string;
};

const overlaps = (a: Project, b: Project) => a.work_date === b.work_date && a.start_time < b.end_time && b.start_time < a.end_time;
const byAvailabilityThenLoadThenName = (availabilityByStaff: Map<string, Availability>, counts: Map<string, number>) => (a: Profile, b: Profile) => {
  const avA = availabilityByStaff.get(a.id)?.status === 'available' ? 0 : 1;
  const avB = availabilityByStaff.get(b.id)?.status === 'available' ? 0 : 1;
  return avA - avB || (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.name.localeCompare(b.name, 'ja') || a.id.localeCompare(b.id);
};

export function autoAssign(input: AutoAssignInput): AssignmentResult[] {
  const runId = input.runId ?? crypto.randomUUID();
  const counts = new Map<string, number>();
  input.previousAssignments?.forEach((a) => counts.set(a.staff_id, (counts.get(a.staff_id) ?? 0) + 1));
  const assignedByStaff = new Map<string, Project[]>();

  return [...input.projects]
    .sort((a, b) => `${a.work_date} ${a.start_time}`.localeCompare(`${b.work_date} ${b.start_time}`) || a.title.localeCompare(b.title, 'ja'))
    .map((project) => {
      const availabilityByStaff = new Map(
        input.availabilities.filter((a) => a.project_id === project.id && a.status !== 'unavailable').map((a) => [a.staff_id, a]),
      );
      const candidates = input.profiles
        .filter((p) => p.role === 'staff' && p.company_id === project.company_id && availabilityByStaff.has(p.id))
        .filter((p) => !(assignedByStaff.get(p.id) ?? []).some((assignedProject) => overlaps(project, assignedProject)))
        .sort(byAvailabilityThenLoadThenName(availabilityByStaff, counts));

      const picked: Profile[] = [];
      const pickFrom = (pool: Profile[], desiredTotal: number) => {
        for (const staff of pool) {
          if (picked.length >= desiredTotal) break;
          if (!picked.some((p) => p.id === staff.id)) picked.push(staff);
        }
      };

      pickFrom(candidates.filter((p) => p.staff_role === 'leader'), project.required_leaders);
      pickFrom(candidates, project.required_people);

      const assignments = picked.map<Assignment>((staff) => ({
        id: crypto.randomUUID(),
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

      const warnings: AssignmentResult['warnings'] = [];
      if (assignments.filter((a) => a.is_leader).length < project.required_leaders) warnings.push('leader_shortage');
      if (assignments.length < project.required_people) warnings.push('people_shortage');
      return { project, assignments, warnings };
    });
}

export async function saveDraftAssignments(results: AssignmentResult[], companyId: string, executedBy: string) {
  const supabase = createServerSupabaseClient(true) ?? createServerSupabaseClient();
  if (!supabase) return { saved: false, reason: 'Supabase is not configured' };
  const runId = results.flatMap((r) => r.assignments)[0]?.run_id ?? crypto.randomUUID();
  await supabase.from('assignment_runs').insert({ id: runId, company_id: companyId, executed_by: executedBy });
  for (const result of results) await supabase.from('assignments').delete().eq('project_id', result.project.id).eq('status', 'draft');
  const assignments = results.flatMap((r) => r.assignments);
  if (assignments.length) await supabase.from('assignments').insert(assignments);
  return { saved: true, runId };
}
