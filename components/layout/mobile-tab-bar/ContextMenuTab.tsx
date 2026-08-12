import { Menu } from '@base-ui/react/menu';
import { LayoutDashboard } from 'lucide-react';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

import type { ContextNavItem } from './types';
import { isPathActive } from './utils';

interface ContextMenuTabProps {
    active: boolean;
    items: ContextNavItem[];
    label: string;
    pathname: string;
    searchParams: string;
    onItemClick: (event: MouseEvent<HTMLElement>) => void;
}

export function ContextMenuTab({ active, items, label, pathname, searchParams, onItemClick }: ContextMenuTabProps) {
    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={label}
                className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1 transition-opacity lg:hidden"
                aria-current={active ? 'page' : undefined}
            >
                <LayoutDashboard className={cn('h-5 w-5', active ? 'text-ink opacity-100' : 'text-ink opacity-70')} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner
                    side="top"
                    align="end"
                    sideOffset={12}
                    positionMethod="fixed"
                    collisionPadding={{ top: 8, right: 12, bottom: 96, left: 12 }}
                    className="z-50"
                >
                    <Menu.Popup className="min-w-52 rounded-2xl border border-border bg-background py-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const itemActive = isPathActive(pathname, item.href, searchParams);

                            return (
                                <Menu.Item
                                    key={`${item.key}-${item.href}`}
                                    onClick={onItemClick}
                                    data-href={item.href}
                                    className={cn(
                                        'mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium outline-none transition-colors',
                                        itemActive ? 'bg-surface-muted text-ink' : 'text-ink hover:bg-surface-muted'
                                    )}
                                >
                                    <span>{item.label}</span>
                                    <Icon className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                                </Menu.Item>
                            );
                        })}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
