import { NavCard } from '@/components/NavCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
  return <section className="space-y-8"><div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-slate-100 p-8 shadow-sm sm:p-12"><Badge tone="blue">Demo Mode</Badge><h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">ログインなしで、案件管理・自動配置・スタッフ導線をすぐ確認できます。</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">認証は一時停止中です。Supabase未設定でも仮データでUIと画面遷移を確認できます。</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="/admin"><Button className="w-full sm:w-auto">管理者画面へ</Button></a><a href="/staff"><Button variant="secondary" className="w-full sm:w-auto">スタッフ画面へ</Button></a></div></div><div className="grid gap-4 md:grid-cols-3"><NavCard href="/admin/projects" title="案件管理" description="案件カードと充足状況を確認" /><NavCard href="/admin/auto-assign" title="自動配置" description="成功・不足・配置スタッフを可視化" /><NavCard href="/staff/calendar" title="スタッフカレンダー" description="月表示でシフト確認" /></div><Card className="p-5 text-sm text-slate-600">後で戻せるようログイン画面・API・既存認証ファイルは削除していません。</Card></section>;
}
