'use client';

import type { LucideIcon } from 'lucide-react';

import type { QrTargetType } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function QrTargetTypeButton({
    item,
    label,
    icon: Icon,
    selected,
    onSelectAction,
}: {
    item: QrTargetType;
    label: string;
    icon: LucideIcon;
    selected: boolean;
    onSelectAction: (item: QrTargetType) => void;
}) {
    function handleSelect() {
        onSelectAction(item);
    }

    return (
        <button
            type="button"
            onClick={handleSelect}
            className={cn(
                'flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition focus:ring-2 focus:ring-primary/25 focus:outline-none',
                selected ? 'bg-card text-ink shadow-sm ring-1 ring-border' : 'bg-surface-muted text-ink-muted hover:text-ink'
            )}
            aria-pressed={selected}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}
