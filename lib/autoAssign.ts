import type { Assignment, AssignmentResult, AutoAssignInput, AvailabilityStatus, Profile, Project } from '@/lib/types';

const overlaps = (a: Project, b: Project) =>
  a.work_date === b.work_date && a.start_time < b.end_time && b.start_time < a.end_time;

const requiredLeaderCount = (project: Project) => Math.max(1, project.required_leaders ?? 0);

export function autoAssign(input: AutoAssignInput): AssignmentResult[] {
  const runId = input.runId ?? `run-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const previousCounts = new Map<string, number>();
  input.previousAssignments?.forEach((assignment) => {
    previousCounts.set(assignment.staff_id, (previousCounts.get(assignment.staff_id) ?? 0) + 1);
  });

  const assignedProjectsByStaff = new Map<string, Project[]>();

  return [...input.projects]
    .filter((project) => project.company_id === input.companyId)
    .sort((a, b) => `${a.work_date} ${a.start_time}`.localeCompare(`${b.work_date} ${b.start_time}`))
    .map((project) => {
      const availabilityByStaff = new Map(
        input.availabilities
          .filter((availability) => availability.company_id === input.companyId && availability.work_date === project.work_date && availability.status !== 'unavailable')
          .map((availability) => [availability.staff_id, availability.status]),
      );

      const sortByPastCount = (a: Profile, b: Profile) =>
        (previousCounts.get(a.id) ?? 0) - (previousCounts.get(b.id) ?? 0) ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id);

      const candidates = (status: AvailabilityStatus) =>
        input.profiles
          .filter((profile) => profile.role === 'staff' && profile.company_id === input.companyId)
          .filter((profile) => availabilityByStaff.get(profile.id) === status)
          .filter((profile) =>
            !(assignedProjectsByStaff.get(profile.id) ?? []).some((assignedProject) => overlaps(project, assignedProject)),
          )
          .sort(sortByPastCount);

      const picked: Profile[] = [];
      const leaderCount = () => picked.filter((staff) => staff.staff_role === 'leader').length;
      const hasPicked = (staff: Profile) => picked.some((pickedStaff) => pickedStaff.id === staff.id);
      const makeRoomForLeader = () => {
        if (picked.length < project.required_people) return true;
        const removableIndex = [...picked]
          .map((staff, index) => ({ index, staff }))
          .reverse()
          .find(({ staff }) => staff.staff_role !== 'leader')?.index;
        if (removableIndex === undefined) return false;
        picked.splice(removableIndex, 1);
        return true;
      };

      const pickLeaders = (pool: Profile[]) => {
        for (const staff of pool) {
          if (leaderCount() >= requiredLeaderCount(project)) break;
          if (staff.staff_role !== 'leader' || hasPicked(staff)) continue;
          if (!makeRoomForLeader()) break;
          picked.push(staff);
        }
      };

      const pickPeople = (pool: Profile[]) => {
        for (const staff of pool) {
          if (picked.length >= project.required_people) break;
          if (!hasPicked(staff)) picked.push(staff);
        }
      };

      const fillFromStatus = (status: AvailabilityStatus) => {
        const pool = candidates(status);
        pickLeaders(pool);
        pickPeople(pool);
      };

      fillFromStatus('available');
      if (picked.length < project.required_people || leaderCount() < requiredLeaderCount(project)) {
        fillFromStatus('conditional');
      }

      const assignments = picked.map<Assignment>((staff) => ({
        id: `${runId}-${project.id}-${staff.id}`,
        company_id: input.companyId,
        project_id: project.id,
        staff_id: staff.id,
        run_id: runId,
        status: 'draft',
        is_leader: staff.staff_role === 'leader',
        created_at: createdAt,
      }));

      picked.forEach((staff) => {
        previousCounts.set(staff.id, (previousCounts.get(staff.id) ?? 0) + 1);
        assignedProjectsByStaff.set(staff.id, [...(assignedProjectsByStaff.get(staff.id) ?? []), project]);
      });

      const assignedLeaderCount = assignments.filter((assignment) => assignment.is_leader).length;
      const warnings: AssignmentResult['warnings'] = [];
      if (assignedLeaderCount < requiredLeaderCount(project)) warnings.push('リーダー不足');
      if (assignments.length < project.required_people) warnings.push('人数不足');

      return { project, assignments, warnings };
    });
}
