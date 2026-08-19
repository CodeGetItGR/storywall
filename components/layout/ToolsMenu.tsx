'use client';

import { Menu } from '@base-ui/react/menu';
import { LayoutGrid } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { cn } from '@/lib/utils';

export function ToolsMenu() {
    const t = useTranslations('DesktopNavRail');
    const router = useRouter();
    const pathname = usePathname();
    const items = useToolsMenuItems();

    const handleItemClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            const href = event.currentTarget.dataset.href;
            if (href) router.push(href);
        },
        [router]
    );

    if (items.length === 0) return null;

    const active = items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

    return (
        <Menu.Root>
            <Menu.Trigger
                className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                )}
            >
                <LayoutGrid className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : '')} strokeWidth={active ? 2.5 : 1.8} />
                {t('items.tools')}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="right" align="start" sideOffset={12} className="z-50">
                    <Menu.Popup className="w-64 rounded-2xl border border-border bg-background p-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');

                            return (
                                <Menu.Item
                                    key={item.key}
                                    onClick={handleItemClick}
                                    data-href={item.href}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 outline-none transition-colors',
                                        itemActive ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                                        <span className="block truncate text-xs text-ink-muted">{item.description}</span>
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
