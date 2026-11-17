import type { LucideIcon } from 'lucide-react';

// The sidebar's heading: the page's mark and name, with the role under it.
export function AdminNavBrand({ icon: Icon, title, eyebrow }: { icon: LucideIcon; title: string; eyebrow: string }) {
    return (
        <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-primary to-primary-dark text-white">
                <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-tight">
                <p className="truncate text-[14.5px] font-extrabold tracking-tight text-ink">{title}</p>
                <p className="text-[10px] font-semibold tracking-[0.06em] text-ink-faint uppercase">{eyebrow}</p>
            </div>
        </div>
    );
}
