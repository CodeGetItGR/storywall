'use client';

import { Menu } from '@base-ui/react/menu';
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type PostActionsMenuProps = {
    deleteLabel: string;
    disabled: boolean;
    isDeleting: boolean;
    moreLabel: string;
    onDeleteAction: () => void;
};

export function PostActionsMenu({ deleteLabel, disabled, isDeleting, moreLabel, onDeleteAction }: PostActionsMenuProps) {
    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={moreLabel}
                disabled={disabled}
                className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors',
                    'hover:bg-surface-muted hover:text-ink-muted',
                    disabled && 'cursor-not-allowed opacity-60'
                )}
            >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={12} className="z-50">
                    <Menu.Popup className="motion-popover w-48 rounded-2xl border border-border bg-background p-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        <Menu.Item
                            onClick={onDeleteAction}
                            disabled={disabled}
                            className={cn(
                                'motion-menu-item flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-destructive outline-none',
                                'hover:bg-destructive/10',
                                disabled && 'cursor-not-allowed opacity-60'
                            )}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                            {deleteLabel}
                        </Menu.Item>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
