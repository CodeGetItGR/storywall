'use client';

import React, { useCallback } from 'react';

import { cn } from '@/lib/utils';

export type UnderlineTabDefinition = {
    key: string;
    label: string;
    tone?: 'default' | 'danger';
    badge?: number;
};

export function UnderlineTabs({
    id,
    tabs,
    active,
    onSelect,
    className,
}: {
    id: string;
    tabs: UnderlineTabDefinition[];
    active: string;
    onSelect: (key: string) => void;
    className?: string;
}) {
    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const key = event.currentTarget.dataset.tabKey;
            if (key) onSelect(key);
        },
        [onSelect]
    );

    return (
        <div role="tablist" className={cn('flex flex-wrap items-end gap-1 border-b border-border', className)}>
            {tabs.map((tab) => {
                const isActive = tab.key === active;
                const isDanger = tab.tone === 'danger';

                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        id={`${id}-tab-${tab.key}`}
                        aria-selected={isActive}
                        aria-controls={`${id}-panel-${tab.key}`}
                        data-tab-key={tab.key}
                        onClick={handleClick}
                        className={cn(
                            '-mb-px inline-flex min-h-10 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition',
                            'focus-visible:rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                            isActive
                                ? isDanger
                                    ? 'border-status-danger text-status-danger'
                                    : 'border-ink text-ink'
                                : cn(
                                      'border-transparent hover:border-border',
                                      isDanger ? 'text-status-danger/70 hover:text-status-danger' : 'text-ink-muted hover:text-ink'
                                  )
                        )}
                    >
                        {tab.label}
                        {typeof tab.badge === 'number' && tab.badge > 0 && (
                            <span
                                className={cn(
                                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                                    isActive ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted'
                                )}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// Panels stay mounted and are hidden with CSS: an unmounted panel would take its
// uncontrolled inputs out of the surrounding form, and a patch built from FormData
// over the whole form still needs a hidden tab to contribute its values.
export function UnderlineTabPanel({
    id,
    tabKey,
    active,
    className,
    children,
}: {
    id: string;
    tabKey: string;
    active: string;
    className?: string;
    children: React.ReactNode;
}) {
    const isActive = tabKey === active;

    return (
        <div
            role="tabpanel"
            id={`${id}-panel-${tabKey}`}
            aria-labelledby={`${id}-tab-${tabKey}`}
            hidden={!isActive}
            className={isActive ? className : 'hidden'}
        >
            {children}
        </div>
    );
}
