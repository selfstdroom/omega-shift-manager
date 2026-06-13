import { NavCard } from '@/components/NavCard';
import { mockProjects, mockProfiles, mockWorkplaces } from '@/data/mockData';

export default function AdminDashboard() {
  const staff = mockProfiles.filter((p) => p.role === 'staff');
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-blue-700">Admin</p><h1 className="text-3xl font-bold">管理者ダッシュボード</h1><p className="mt-2 text-slate-600">事業所、スタッフ、案件、自動配置を管理します。Supabase未設定時は初期デモデータを表示します。</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-5 shadow">事業所 <b className="text-2xl">{mockWorkplaces.length}</b></div><div className="rounded-xl bg-white p-5 shadow">スタッフ <b className="text-2xl">{staff.length}</b></div><div className="rounded-xl bg-white p-5 shadow">案件 <b className="text-2xl">{mockProjects.length}</b></div></div><div className="grid gap-4 md:grid-cols-2"><NavCard href="/admin/workplaces" title="事業所一覧・作成" description="拠点情報を確認し、新規作成フォームへ移動"/><NavCard href="/admin/staff" title="スタッフ一覧・作成" description="スタッフ/リーダーの役職を管理"/><NavCard href="/admin/projects" title="案件一覧" description="勤務日、時間、必要人数を確認"/><NavCard href="/admin/auto-assign" title="自動配置実行" description="案件ごとにドラフト配置を作成"/><NavCard href="/admin/assignments" title="配置結果確認" description="リーダー不足・人数不足を確認"/></div></div>;
}
