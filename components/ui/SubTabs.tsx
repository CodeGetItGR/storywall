'use client';

import type { LucideIcon } from 'lucide-react';
import { type MouseEvent, useCallback } from 'react';

import { cn } from '@/lib/utils';

export type SubTabItem<T extends string> = {
    key: T;
    label: string;
    icon: LucideIcon;
};

export function SubTabs<T extends string>({
    tabs,
    active,
    onSelectAction,
    className,
}: {
    tabs: SubTabItem<T>[];
    active: T;
    onSelectAction: (key: T) => void;
    className?: string;
}) {
    const handleClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const next = event.currentTarget.dataset.subtab;
            if (next) onSelectAction(next as T);
        },
        [onSelectAction]
    );

    return (
        <div className={cn('flex w-full items-center justify-center gap-4', className)}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        data-subtab={tab.key}
                        onClick={handleClick}
                        aria-pressed={isActive}
                        className={cn(
                            'flex min-h-9 items-center gap-1.5 border-b-2 px-1 text-xs font-semibold transition-colors',
                            isActive ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
