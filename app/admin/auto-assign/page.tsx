import { StatusBadge } from '@/components/StatusBadge';
import { autoAssign } from '@/lib/autoAssign';
import { mockAvailabilities, mockCompany, mockPreviousAssignments, mockProfiles, mockProjects } from '@/lib/mockData';

const results = autoAssign({
  companyId: mockCompany.id,
  executedBy: 'admin-1',
  projects: mockProjects,
  profiles: mockProfiles,
  availabilities: mockAvailabilities,
  previousAssignments: mockPreviousAssignments,
  runId: 'demo-run',
});

const staffName = (staffId: string) => mockProfiles.find((profile) => profile.id === staffId)?.name ?? staffId;
const staffAvailability = (projectId: string, staffId: string) =>
  mockAvailabilities.find((availability) => availability.project_id === projectId && availability.staff_id === staffId)?.status ?? 'unknown';

export default function AutoAssignPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-700">Supabase未接続の仮データ検証ページ</p>
        <h1 className="text-3xl font-bold">自動配置テスト</h1>
        <p className="mt-2 text-slate-600">
          availableを優先し、不足時だけconditionalを候補にします。unavailableと同日時に重なる配置済みスタッフは除外します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow">案件 <b>{mockProjects.length}</b></div>
        <div className="rounded-xl bg-white p-5 shadow">スタッフ <b>{mockProfiles.filter((profile) => profile.role === 'staff').length}</b></div>
        <div className="rounded-xl bg-white p-5 shadow">過去配置 <b>{mockPreviousAssignments.length}</b></div>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <section className="rounded-xl bg-white p-5 shadow" key={result.project.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{result.project.title}</h2>
                <p className="text-sm text-slate-600">
                  {result.project.work_date} {result.project.start_time}-{result.project.end_time} / 必要人数 {result.project.required_people}名 / 必要リーダー {Math.max(1, result.project.required_leaders ?? 0)}名
                </p>
                <p className="mt-1 text-sm text-slate-500">{result.project.note}</p>
              </div>
              <div className="flex gap-2">
                {result.warnings.length === 0 ? <StatusBadge tone="green">OK</StatusBadge> : result.warnings.map((warning) => <StatusBadge key={warning} tone="red">{warning}</StatusBadge>)}
              </div>
            </div>

            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3">配置スタッフ</th>
                  <th className="p-3">役割</th>
                  <th className="p-3">希望ステータス</th>
                </tr>
              </thead>
              <tbody>
                {result.assignments.length === 0 ? (
                  <tr><td className="p-3 text-slate-500" colSpan={3}>未配置</td></tr>
                ) : result.assignments.map((assignment) => (
                  <tr className="border-b" key={assignment.id}>
                    <td className="p-3">{staffName(assignment.staff_id)}</td>
                    <td className="p-3">{assignment.is_leader ? <StatusBadge tone="blue">leader</StatusBadge> : 'staff'}</td>
                    <td className="p-3">{staffAvailability(result.project.id, assignment.staff_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
