export function StatusBadge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' | 'green' | 'amber' | 'blue' }) {
  const colors = { slate: 'bg-slate-100 text-slate-700', red: 'bg-red-100 text-red-700', green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-blue-100 text-blue-700' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}
