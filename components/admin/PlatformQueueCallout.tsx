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
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-status-warn transition hover:bg-status-warn/5"
            >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="mr-1.5 font-bold tabular-nums">{formatCount(count)}</span>
                    <span className="font-semibold">{label}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold group-hover:underline">
                    {action}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}
