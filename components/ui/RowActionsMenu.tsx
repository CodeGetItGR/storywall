'use client';

import { Menu } from '@base-ui/react/menu';
import { type LucideIcon, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';

export type RowAction = {
    key: string;
    label: string;
    icon: LucideIcon;
    onSelect: () => void;
    tone?: 'default' | 'danger';
    // Keep the menu open after the click, e.g. so "Copied!" can show.
    keepOpen?: boolean;
};

// A row's ⋯ button. `label` names it for screen readers ("More options for Anna").
export function RowActionsMenu({ label, items }: { label: string; items: RowAction[] }) {
    if (items.length === 0) return null;

    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={label}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={12} className="z-50">
                    <Menu.Popup className="motion-popover w-52 rounded-2xl border border-border bg-background p-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        {items.map(({ key, label: itemLabel, icon: Icon, onSelect, tone = 'default', keepOpen }) => (
                            <Menu.Item
                                key={key}
                                onClick={onSelect}
                                closeOnClick={!keepOpen}
                                className={cn(
                                    'motion-menu-item flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium outline-none',
                                    tone === 'danger' ? 'text-destructive hover:bg-destructive/10' : 'text-ink hover:bg-surface-muted',
                                )}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                {itemLabel}
                            </Menu.Item>
                        ))}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
