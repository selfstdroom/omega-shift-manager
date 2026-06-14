import type { HTMLAttributes } from 'react';
const tones={blue:'bg-blue-50 text-[#2563EB] ring-blue-100',green:'bg-green-50 text-[#16A34A] ring-green-100',orange:'bg-orange-50 text-[#EA580C] ring-orange-100',red:'bg-red-50 text-[#DC2626] ring-red-100',slate:'bg-slate-100 text-slate-700 ring-slate-200'};
export function Badge({tone='slate',className='',...props}:HTMLAttributes<HTMLSpanElement>&{tone?:keyof typeof tones}){return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ${tones[tone]} ${className}`} {...props}/>}
