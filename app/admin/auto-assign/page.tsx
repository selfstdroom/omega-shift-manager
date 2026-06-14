'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { autoAssign } from '@/lib/autoAssign';
import { demoAdmin } from '@/lib/demo';
import { mockAvailabilities, mockCompany, mockPreviousAssignments, mockProfiles, mockProjects } from '@/lib/mockData';
import type { Assignment, AssignmentResult, AvailabilityStatus, Profile, Project } from '@/lib/types';

type Candidate = {
  profile: Profile;
  availability: AvailabilityStatus;
  conflictProjects: Project[];
  assignmentCount: number;
};

const requiredLeaders = (project: Project) => Math.max(1, project.required_leaders ?? 0);
const overlaps = (a: Project, b: Project) => a.work_date === b.work_date && a.start_time < b.end_time && b.start_time < a.end_time;

export default function AutoAssignPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white p-6 font-bold text-slate-700 shadow-sm">自動配置を読み込み中...</div>}>
      <AutoAssignContent />
    </Suspense>
  );
}

function AutoAssignContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const savedProjects = typeof window === 'undefined' ? null : window.localStorage.getItem('omega-demo-projects');
  const savedStaff = typeof window === 'undefined' ? null : window.localStorage.getItem('omega-demo-staff');
  const projects = useMemo(() => {
    const base = savedProjects ? (JSON.parse(savedProjects) as Project[]) : mockProjects;
    return projectId ? base.filter((p) => p.id === projectId) : base;
  }, [projectId, savedProjects]);
  const profiles = useMemo(() => (savedStaff ? [mockProfiles.find((p) => p.role === 'admin') ?? mockProfiles[0], ...(JSON.parse(savedStaff) as Profile[])] : mockProfiles), [savedStaff]);
  const [results, setResults] = useState<AssignmentResult[]>([]);
  const [dirtyConfirmed, setDirtyConfirmed] = useState<Record<string, boolean>>({});

  const run = () => {
    setDirtyConfirmed({});
    setResults(autoAssign({ companyId: mockCompany.id, executedBy: demoAdmin.id, projects, profiles, availabilities: mockAvailabilities, previousAssignments: mockPreviousAssignments, runId: `demo-run-${Date.now()}` }));
  };

  const staffName = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  const availability = (workDate: string, staffId: string) => mockAvailabilities.find((a) => a.work_date === workDate && a.staff_id === staffId)?.status;
  const assignmentCount = (staffId: string) => mockPreviousAssignments.filter((a) => a.staff_id === staffId).length + results.reduce((sum, r) => sum + (r.assignments.some((a) => a.staff_id === staffId) ? 1 : 0), 0);

  const recalc = (result: AssignmentResult): AssignmentResult => {
    const warnings: AssignmentResult['warnings'] = [];
    if (result.assignments.filter((a) => a.is_leader).length < requiredLeaders(result.project)) warnings.push('リーダー不足');
    if (result.assignments.length < result.project.required_people) warnings.push('人数不足');
    return { ...result, warnings };
  };

  const updateResult = (projectIdToUpdate: string, updater: (result: AssignmentResult) => AssignmentResult, warnWhenConfirmed = true) => {
    setResults((current) => current.map((result) => {
      if (result.project.id !== projectIdToUpdate) return result;
      if (warnWhenConfirmed && result.assignments.some((a) => a.status === 'confirmed')) {
        setDirtyConfirmed((flags) => ({ ...flags, [projectIdToUpdate]: true }));
      }
      return recalc(updater(result));
    }));
  };

  const addStaff = (projectIdToUpdate: string, staffId: string, asLeader: boolean) => updateResult(projectIdToUpdate, (result) => {
    if (result.assignments.some((a) => a.staff_id === staffId)) return result;
    const assignment: Assignment = {
      id: `manual-${result.project.id}-${staffId}-${Date.now()}`,
      company_id: result.project.company_id,
      project_id: result.project.id,
      staff_id: staffId,
      run_id: result.assignments[0]?.run_id ?? 'manual-demo',
      status: result.assignments[0]?.status ?? 'draft',
      is_leader: asLeader,
      created_at: new Date().toISOString(),
    };
    return { ...result, assignments: [...result.assignments, assignment] };
  });

  const removeStaff = (projectIdToUpdate: string, staffId: string) => updateResult(projectIdToUpdate, (result) => ({ ...result, assignments: result.assignments.filter((a) => a.staff_id !== staffId) }));
  const setLeader = (projectIdToUpdate: string, staffId: string, isLeader: boolean) => updateResult(projectIdToUpdate, (result) => ({ ...result, assignments: result.assignments.map((a) => (a.staff_id === staffId ? { ...a, is_leader: isLeader } : a)) }));
  const confirmProject = (projectIdToUpdate: string) => updateResult(projectIdToUpdate, (result) => ({ ...result, assignments: result.assignments.map((a) => ({ ...a, status: 'confirmed' })) }), false);
  const confirmAll = () => {
    setResults((current) => current.map((result) => ({ ...result, assignments: result.assignments.map((a) => ({ ...a, status: 'confirmed' })) })));
    setDirtyConfirmed({});
  };

  const candidatesFor = (result: AssignmentResult): Candidate[] => profiles
    .filter((profile) => profile.role === 'staff' && !result.assignments.some((a) => a.staff_id === profile.id))
    .map((profile) => ({ profile, availability: availability(result.project.work_date, profile.id), conflictProjects: results.filter((other) => other.project.id !== result.project.id && other.assignments.some((a) => a.staff_id === profile.id) && overlaps(result.project, other.project)).map((other) => other.project), assignmentCount: assignmentCount(profile.id) }))
    .filter((candidate): candidate is Candidate => candidate.availability === 'available' || candidate.availability === 'conditional')
    .sort((a, b) => {
      const availabilityRank = (status: AvailabilityStatus) => status === 'available' ? 0 : 1;
      return a.conflictProjects.length - b.conflictProjects.length || availabilityRank(a.availability) - availabilityRank(b.availability) || a.assignmentCount - b.assignmentCount;
    });

  const ok = results.filter((r) => !r.warnings.length).length;
  const peopleShortage = results.filter((r) => r.warnings.includes('人数不足')).length;
  const leaderShortage = results.filter((r) => r.warnings.includes('リーダー不足')).length;

  return (
    <div>
      <PageHeader title="自動配置" description="自動配置結果を案件カードごとに確認し、現場でそのまま追加・除外・リーダー変更・確定ができます。デモモードでも画面上で編集が反映されます。" actions={<div className="flex flex-wrap gap-2"><Button onClick={run} className="min-h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-slate-900 px-8 text-base shadow-lg shadow-blue-200">自動配置を実行</Button>{results.length > 0 && <Button onClick={confirmAll} variant="secondary" className="min-h-14 rounded-2xl px-8 text-base">全案件を確定</Button>}</div>} />
      {results.length > 0 && <div className="mb-6 grid gap-4 sm:grid-cols-4"><StatCard label="対象案件" value={results.length} /><StatCard label="成功案件" value={ok} tone="green" /><StatCard label="人数不足" value={peopleShortage} tone="orange" /><StatCard label="リーダー不足" value={leaderShortage} tone="red" /></div>}
      {!results.length ? <EmptyState title="配置結果はまだありません" description="ログインやSupabase接続なしで、仮データの勤務可否から自動配置を試せます。" action={<Button onClick={run}>今すぐ実行</Button>} /> : <div className="space-y-6">{results.map((result) => <ResultCard key={result.project.id} result={result} dirtyConfirmed={!!dirtyConfirmed[result.project.id]} staffName={staffName} availability={availability} assignmentCount={assignmentCount} candidates={candidatesFor(result)} onAdd={addStaff} onRemove={removeStaff} onSetLeader={setLeader} onConfirm={confirmProject} />)}</div>}
    </div>
  );
}

function ResultCard({ result, dirtyConfirmed, staffName, availability, assignmentCount, candidates, onAdd, onRemove, onSetLeader, onConfirm }: { result: AssignmentResult; dirtyConfirmed: boolean; staffName: (id: string) => string; availability: (workDate: string, staffId: string) => AvailabilityStatus | undefined; assignmentCount: (staffId: string) => number; candidates: Candidate[]; onAdd: (projectId: string, staffId: string, asLeader: boolean) => void; onRemove: (projectId: string, staffId: string) => void; onSetLeader: (projectId: string, staffId: string, isLeader: boolean) => void; onConfirm: (projectId: string) => void; }) {
  const assignedLeaders = result.assignments.filter((a) => a.is_leader).length;
  const isConfirmed = result.assignments.length > 0 && result.assignments.every((a) => a.status === 'confirmed');
  const shortage = result.warnings.length > 0;
  const badgeTone = isConfirmed ? 'blue' : !shortage ? 'green' : result.warnings.includes('人数不足') ? 'orange' : 'red';

  return (
    <Card className={`overflow-hidden border-l-4 ${isConfirmed ? 'border-l-blue-500 bg-blue-50/20' : !shortage ? 'border-l-green-500' : 'border-l-orange-500'}`}>
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{result.project.title}</h2><Badge tone={badgeTone}>{isConfirmed ? '確定済み' : shortage ? result.warnings.join('・') : '配置成功'}</Badge>{dirtyConfirmed && <Badge tone="red">確定後に変更あり</Badge>}</div><p className="mt-2 text-sm font-semibold text-slate-600">📅 {result.project.work_date}　🕘 {result.project.start_time}-{result.project.end_time}　📍 {result.project.location}</p></div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><Mini label="必要人数" value={result.project.required_people} /><Mini label="配置済み" value={result.assignments.length} /><Mini label="必要L" value={requiredLeaders(result.project)} /><Mini label="配置済みL" value={assignedLeaders} /></div>
        </div>
        <Button onClick={() => onConfirm(result.project.id)} className="mt-4 w-full rounded-2xl sm:w-auto">この配置を確定</Button>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="p-5"><h3 className="text-sm font-black text-slate-500">配置済みスタッフ（ドラッグ&ドロップ風エリア）</h3><div className="mt-3 min-h-40 space-y-3 rounded-3xl border-2 border-dashed border-blue-100 bg-slate-50/70 p-3">{result.assignments.map((assignment) => { const av = availability(result.project.work_date, assignment.staff_id); return <div key={assignment.staff_id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950">{assignment.is_leader ? '👑 ' : ''}{staffName(assignment.staff_id)}</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={assignment.is_leader ? 'blue' : 'slate'}>{assignment.is_leader ? 'leader' : 'staff'}</Badge><Badge tone={av === 'conditional' ? 'orange' : 'green'}>{av === 'conditional' ? '条件付き' : '勤務可'}</Badge><Badge>配置{assignmentCount(assignment.staff_id)}回</Badge></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => onSetLeader(result.project.id, assignment.staff_id, true)} disabled={assignment.is_leader}>リーダーにする</Button><Button variant="secondary" onClick={() => onSetLeader(result.project.id, assignment.staff_id, false)} disabled={!assignment.is_leader}>一般スタッフに戻す</Button><Button variant="danger" onClick={() => onRemove(result.project.id, assignment.staff_id)}>外す</Button></div></div></div>; })}{result.assignments.length === 0 && <p className="p-6 text-center text-sm font-bold text-slate-400">まだ配置がありません。右の候補から追加してください。</p>}</div></section>
        <section className={`border-t border-slate-100 p-5 lg:border-l lg:border-t-0 ${shortage ? 'bg-orange-50/60' : 'bg-white'}`}><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-slate-500">候補スタッフ一覧</h3>{shortage && <Badge tone="orange">不足補助：追加候補を強調中</Badge>}</div><div className="mt-3 space-y-3">{candidates.map((candidate) => <div key={candidate.profile.id} className={`rounded-2xl border p-4 ${candidate.conflictProjects.length ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950">{candidate.profile.name}</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={candidate.profile.staff_role === 'leader' ? 'blue' : 'slate'}>{candidate.profile.staff_role}</Badge><Badge tone={candidate.availability === 'conditional' ? 'orange' : 'green'}>{candidate.availability === 'conditional' ? '条件付き' : '勤務可'}</Badge><Badge>配置{candidate.assignmentCount}回</Badge>{candidate.conflictProjects.length > 0 && <Badge tone="red">同時間帯あり</Badge>}</div>{candidate.conflictProjects.length > 0 && <p className="mt-2 text-xs font-bold text-red-600">注意：{candidate.conflictProjects.map((p) => p.title).join('、')} と時間が重なります。</p>}</div><div className="flex flex-wrap gap-2"><Button onClick={() => onAdd(result.project.id, candidate.profile.id, false)} disabled={candidate.conflictProjects.length > 0}>この案件に追加</Button><Button variant="secondary" onClick={() => onAdd(result.project.id, candidate.profile.id, true)} disabled={candidate.conflictProjects.length > 0}>リーダーとして追加</Button></div></div></div>)}{candidates.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-slate-400">この日に追加できる候補はいません。</p>}</div></section>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-100"><p className="text-xs font-bold text-slate-400">{label}</p><p className="text-2xl font-black text-slate-950">{value}</p></div>;
}
