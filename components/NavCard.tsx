import Link from 'next/link';

export function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link className="block rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" href={href}><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p></Link>;
}
