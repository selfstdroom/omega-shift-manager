import type { InputHTMLAttributes } from 'react';
export function Input({className='',...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 ${className}`} {...props}/>}
