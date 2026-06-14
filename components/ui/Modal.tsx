import { Card } from './Card';
import { Button } from './Button';
export function Modal({open,title,children,onClose}:{open:boolean;title:string;children:React.ReactNode;onClose:()=>void}){if(!open)return null;return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4"><Card className="w-full max-w-lg p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><Button variant="ghost" onClick={onClose}>閉じる</Button></div>{children}</Card></div>}
