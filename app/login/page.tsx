import Link from 'next/link';

export default function LoginPage() {
  return <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">ログイン種別を選択</h1><p className="mt-2 text-sm text-slate-600">管理者とスタッフでログイン方式が異なります。</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><Link className="rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:bg-blue-50" href="/admin/login"><h2 className="font-bold">管理者ログイン</h2><p className="mt-2 text-sm text-slate-600">ログインID / パスワード</p></Link><Link className="rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:bg-blue-50" href="/staff/login"><h2 className="font-bold">スタッフログイン</h2><p className="mt-2 text-sm text-slate-600">メールアドレス / パスワード</p></Link></div></div>;
}
