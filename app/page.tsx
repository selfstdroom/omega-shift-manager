import { NavCard } from '@/components/NavCard';

export default function Home() {
  return <section className="space-y-8"><div className="rounded-2xl bg-slate-900 p-8 text-white"><p className="text-sm font-semibold text-blue-200">Supabase Production Ready</p><h1 className="mt-3 text-4xl font-bold">オメガテクノの案件・勤務可能日・自動配置を一元管理</h1><p className="mt-4 max-w-2xl text-slate-200">Supabase Authと実データで、管理者CRUD・スタッフ勤務可否・自動配置保存まで運用できます。</p></div><div className="grid gap-4 md:grid-cols-3"><NavCard href="/login" title="ログイン" description="メール/パスワードで認証" /><NavCard href="/admin/auto-assign" title="自動配置" description="実データで配置して履歴を保存" /><NavCard href="/staff/shifts" title="自分のシフト" description="自分に割り当てられた案件のみ表示" /></div></section>;
}
