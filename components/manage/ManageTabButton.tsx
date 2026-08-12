import type { ElementType } from 'react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

export type ManageTab = 'overview' | 'rsvp' | 'invitations' | 'settings';

interface ManageTabButtonProps {
    tabKey: ManageTab;
    active: boolean;
    Icon: ElementType;
    label: string;
    onSelect: (tab: ManageTab) => void;
}

export function ManageTabButton({ tabKey, active, Icon, label, onSelect }: ManageTabButtonProps) {
    const handleClick = useCallback(() => {
        onSelect(tabKey);
    }, [onSelect, tabKey]);

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-semibold transition-colors',
                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {label}
        </button>
    );
}
