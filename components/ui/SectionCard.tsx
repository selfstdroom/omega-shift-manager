import { Card } from './Card';

export function SectionCard({ title, description, children, className = '' }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return <Card className={`p-5 ${className}`}><div className="mb-4"><h2 className="text-lg font-bold text-slate-950">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{children}</Card>;
}
