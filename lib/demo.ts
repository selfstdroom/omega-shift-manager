import { autoAssign } from '@/lib/autoAssign';
import { mockAvailabilities, mockCompany, mockPreviousAssignments, mockProfiles, mockProjects, mockProjectWorkDays } from '@/lib/mockData';
import type { Assignment, Profile, Project, ProjectWorkDay } from '@/lib/types';

export const DEMO_USER = {
  id: 'staff-1',
  name: '佐藤 リーダー',
  role: 'staff',
} as const;

export const demoAdmin: Profile = mockProfiles.find((p) => p.role === 'admin') ?? mockProfiles[0];
export const demoStaff: Profile = mockProfiles.find((p) => p.role === 'staff') ?? mockProfiles[1];

export const getDemoAssignmentResults = () => autoAssign({
  companyId: mockCompany.id,
  executedBy: demoAdmin.id,
  projects: mockProjectWorkDays,
  profiles: mockProfiles,
  availabilities: mockAvailabilities,
  previousAssignments: mockPreviousAssignments,
  runId: 'demo-run',
});

export const getDemoAssignments = (): Assignment[] => getDemoAssignmentResults().flatMap((r) => r.assignments);

export const getProjectFill = (project: Project | ProjectWorkDay, assignments = getDemoAssignments()) => {
  const projectAssignments = assignments.filter((a) => a.project_id === project.id);
  const leaders = projectAssignments.filter((a) => a.is_leader).length;
  const requiredLeaders = Math.max(1, project.required_leaders ?? 0);
  return {
    assigned: projectAssignments.length,
    leaders,
    peopleOk: projectAssignments.length >= project.required_people,
    leadersOk: leaders >= requiredLeaders,
    requiredLeaders,
  };
};

export const getDemoShiftRows = (staffId = demoStaff.id) => getDemoAssignments()
  .filter((a) => a.staff_id === staffId)
  .map((a, index) => ({
    ...a,
    status: index < 2 ? 'confirmed' as const : 'draft' as const,
    projects: mockProjects.find((p) => p.id === a.project_id) ?? null,
  }));
