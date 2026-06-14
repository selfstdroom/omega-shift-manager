import { Card } from './Card';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <Card className="grid place-items-center p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl">✦</div><h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>{description && <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>}{action && <div className="mt-5">{action}</div>}</Card>;
}
