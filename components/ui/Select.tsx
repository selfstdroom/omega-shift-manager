import type { SelectHTMLAttributes } from 'react';
export function Select({className='',...props}:SelectHTMLAttributes<HTMLSelectElement>){return <select className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${className}`} {...props}/>}
