import { NavCard } from '@/components/NavCard';

export default function Home() {
  return <section className="space-y-8"><div className="rounded-2xl bg-slate-900 p-8 text-white"><p className="text-sm font-semibold text-blue-200">MVP / Supabase Ready</p><h1 className="mt-3 text-4xl font-bold">オメガテクノの案件・勤務可能日・自動配置を一元管理</h1><p className="mt-4 max-w-2xl text-slate-200">Supabase未設定でも仮データで画面と自動配置ロジックを確認できます。</p></div><div className="grid gap-4 md:grid-cols-3"><NavCard href="/login" title="ログイン" description="仮の権限選択で管理者/スタッフへ移動" /><NavCard href="/admin/assignments/run" title="自動配置" description="リーダー不足・人数不足の警告を確認" /><NavCard href="/staff/shifts" title="自分のシフト" description="スタッフに割り当てられた案件のみ表示" /></div></section>;
}
