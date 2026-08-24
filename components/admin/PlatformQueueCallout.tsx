import { ArrowRight, type LucideIcon } from 'lucide-react';

import { formatCount } from '@/lib/format';

export function PlatformQueueCallout({
    label,
    count,
    action,
    icon: Icon,
    onOpen,
}: {
    label: string;
    count: number;
    action: string;
    icon: LucideIcon;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex min-w-0 flex-1 items-center gap-3 border border-status-warn-wash bg-status-warn-wash px-4 py-3 text-left transition hover:opacity-90"
        >
            <Icon className="h-5 w-5 shrink-0 text-status-warn" aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold tabular-nums leading-tight text-status-warn">{formatCount(count)}</span>
                <span className="block truncate text-xs font-semibold text-status-warn">{label}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-status-warn group-hover:underline">
                {action}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
        </button>
    );
}
