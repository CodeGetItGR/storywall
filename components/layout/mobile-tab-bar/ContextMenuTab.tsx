import { Menu } from '@base-ui/react/menu';
import { type LucideIcon, Menu as MenuIcon, X } from 'lucide-react';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils';

import type { ContextNavItem } from './types';
import { isPathActive } from './utils';

interface ContextMenuTabProps {
    active: boolean;
    TriggerIcon?: LucideIcon;
    items: ContextNavItem[];
    label: string;
    pathname: string;
    searchParams: string;
    onItemClick: (event: MouseEvent<HTMLElement>) => void;
}

export function ContextMenuTab({ active, TriggerIcon = MenuIcon, items, label, pathname, searchParams, onItemClick }: ContextMenuTabProps) {
    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={label}
                className="group flex min-w-12 flex-col items-center gap-0.5 px-3 py-1 transition-opacity lg:hidden"
                aria-current={active ? 'page' : undefined}
            >
                <span
                    className={cn(
                        'relative flex h-10 w-10 items-center justify-center transition-all duration-200',
                        active ? 'scale-105 opacity-100' : 'scale-100 opacity-50',
                        'group-data-popup-open:scale-105 group-data-popup-open:opacity-100'
                    )}
                >
                    <TriggerIcon
                        className={cn(
                            'absolute h-5.5 w-5.5 transition-all duration-200',
                            active ? 'text-ink opacity-100' : 'text-ink opacity-100',
                            'group-data-popup-open:scale-90 group-data-popup-open:opacity-0'
                        )}
                        aria-hidden="true"
                    />
                    <X
                        className="absolute h-5.5 w-5.5 scale-90 text-ink opacity-0 transition-all duration-200 group-data-popup-open:scale-100 group-data-popup-open:opacity-100"
                        aria-hidden="true"
                    />
                </span>
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner
                    side="top"
                    align="end"
                    sideOffset={12}
                    positionMethod="fixed"
                    collisionPadding={{ top: 8, right: 12, bottom: 96, left: 12 }}
                    className="z-200"
                >
                    <Menu.Popup className="motion-popover w-64 rounded-2xl border border-border bg-background p-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const itemActive = isPathActive(pathname, item.href, searchParams);

                            return (
                                <Menu.Item
                                    key={`${item.key}-${item.href}`}
                                    onClick={onItemClick}
                                    data-href={item.href}
                                    className={cn(
                                        'motion-menu-item flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 outline-none',
                                        itemActive ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                                        {item.description && <span className="block truncate text-xs text-ink-muted">{item.description}</span>}
                                    </span>
                                </Menu.Item>
                            );
                        })}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
