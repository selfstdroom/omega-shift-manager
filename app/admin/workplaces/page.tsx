import Link from 'next/link';
import { mockWorkplaces } from '@/data/mockData';

export default function Page(){return <div><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-2xl font-bold">事業所一覧・作成</h1><Link className="rounded bg-slate-900 px-3 py-2 text-center text-white" href="/admin/workplaces/new">作成</Link></div><div className="grid gap-3 sm:grid-cols-2">{mockWorkplaces.map(w=><div className="rounded bg-white p-4 shadow" key={w.id}><b>{w.name}</b><p className="text-sm text-slate-600">{w.address}</p></div>)}</div></div>}
