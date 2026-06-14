import { Badge } from './Badge';
import { Card } from './Card';

export function StatCard({ label, value, tone = 'blue', helper }: { label: string; value: string | number; tone?: 'blue' | 'green' | 'orange' | 'red' | 'slate'; helper?: string }) {
  return <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md"><Badge tone={tone}>{label}</Badge><p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{value}</p>{helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}</Card>;
}
