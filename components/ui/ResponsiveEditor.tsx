'use client';

import { Button } from './Button';

export function ResponsiveEditor({ open, title, subtitle, children, onClose }: { open: boolean; title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="fixed bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[460px] md:rounded-none md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">クリックして編集</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" onClick={onClose}>閉じる</Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
