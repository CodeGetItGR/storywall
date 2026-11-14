import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// One count: icon, label, number, an optional muted line, and an optional hover detail.
export function EventActivityTile({
    icon: Icon,
    tint,
    label,
    value,
    detail,
    title,
}: {
    icon: LucideIcon;
    tint: string;
    label: string;
    value: string;
    detail?: ReactNode;
    title?: string;
}) {
    return (
        <div className="min-w-0 rounded-xl bg-card px-4 py-3.5" title={title}>
            {/* Label */}
            <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${tint}1f`, color: tint }}>
                    <Icon aria-hidden="true" className="h-[15px] w-[15px]" />
                </span>
                <span className="truncate">{label}</span>
            </div>
            {/* Value */}
            <p className="mt-1.5 text-[22px] leading-tight font-semibold text-ink tabular-nums">{value}</p>
            {detail && <p className="mt-0.5 truncate text-xs text-ink-faint">{detail}</p>}
        </div>
    );
}
