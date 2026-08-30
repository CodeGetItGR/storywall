'use client';

import { Menu } from '@base-ui/react/menu';
import { LayoutGrid } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { cn } from '@/lib/utils';

export function DesktopAccountToolsMenu({ expanded }: { expanded: boolean }) {
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
                title={expanded ? undefined : t('items.tools')}
                className={cn(
                    'flex min-h-11 w-full items-center rounded-full text-sm font-semibold ring-1 transition-[background-color,transform,color] active:scale-[0.99]',
                    expanded ? 'gap-3 px-4 py-2.5' : 'justify-center px-0 py-2.5',
                    active
                        ? 'bg-white/18 text-white ring-white/70'
                        : 'bg-white/10 text-white/88 ring-white/14 hover:bg-white/16 hover:text-white'
                )}
            >
                <LayoutGrid className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-white/80')} aria-hidden="true" strokeWidth={active ? 2.3 : 1.8} />
                <span className={cn('truncate transition-opacity', expanded ? 'opacity-100' : 'sr-only opacity-0')}>{t('items.tools')}</span>
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="right" align="start" sideOffset={12} className="z-50">
                    <Menu.Popup className="motion-popover w-64 rounded-2xl border border-white/18 bg-primary-dark p-1 shadow-[0_18px_40px_0_rgb(20_15_10_/_0.24)] outline-none">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');

                            return (
                                <Menu.Item
                                    key={item.key}
                                    onClick={handleItemClick}
                                    data-href={item.href}
                                    className={cn(
                                        'motion-menu-item flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 outline-none',
                                        itemActive ? 'bg-white/18' : 'hover:bg-white/12'
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-white/75" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                                        <span className="block truncate text-xs text-white/62">{item.description}</span>
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
