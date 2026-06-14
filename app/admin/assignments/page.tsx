import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminAssignmentsPage() {
  return (
    <div>
      <PageHeader title="配置確定・通知" description="配置結果を案件ごと、または全案件まとめて確定すると、スタッフにWebアプリ内通知が作成されます。" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/auto-assign"><Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md"><h2 className="text-lg font-black text-slate-950">自動配置へ</h2><p className="mt-2 text-sm font-bold text-slate-500">案件ごとの確定、全案件確定、通知生成を行います。</p></Card></Link>
        <Link href="/staff/notifications"><Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md"><h2 className="text-lg font-black text-slate-950">スタッフ通知を確認</h2><p className="mt-2 text-sm font-bold text-slate-500">デモスタッフに届くアプリ内通知を確認します。</p></Card></Link>
      </div>
    </div>
  );
}
