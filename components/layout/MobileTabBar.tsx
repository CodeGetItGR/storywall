'use client';

import { Menu } from '@base-ui/react/menu';
import { CalendarDays, CreditCard, LayoutDashboard, type LucideIcon, MessageSquareText, Plus, Settings2, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

const tabItems = [
    { href: routes.feed, icon: '/icons/home.svg', key: 'home' },
    { href: routes.tools.playlist, icon: '/icons/music.svg', key: 'playlist' },
];

function hostMenuItems(eventId: string) {
    return [
        { href: routes.manage, icon: LayoutDashboard, key: 'manage' },
        { href: routes.tools.schedule, icon: CalendarDays, key: 'schedule' },
        { href: routes.tools.rsvp, icon: Ticket, key: 'rsvps' },
        { href: routes.auth.manage({ tab: 'invitations' }), icon: MessageSquareText, key: 'invitations' },
        { href: routes.auth.manage({ tab: 'settings' }), icon: Settings2, key: 'settings' },
        { href: routes.events.settingsPlan(eventId), icon: CreditCard, key: 'billing' },
    ] as const;
}

const guestScheduleItem = { href: routes.tools.schedule, key: 'schedule' } as const;

interface ContextNavItem {
    href: string;
    icon: LucideIcon;
    key: string;
    label: string;
}

interface TabLinkProps {
    href: string;
    icon: string;
    label: string;
    active: boolean;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

function TabLink({ href, icon, label, active, onClick }: TabLinkProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <Image
                src={icon}
                alt={label}
                width={20}
                height={20}
                className={cn('h-5 w-5 transition-opacity', active ? 'opacity-100' : 'opacity-70')}
                loading="eager"
            />
        </Link>
    );
}

interface ContextTabLinkProps {
    item: ContextNavItem;
    active: boolean;
    label: string;
}

function ContextTabLink({ item, active, label }: ContextTabLinkProps) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className={cn('h-5 w-5 transition-opacity', active ? 'text-ink opacity-100' : 'text-ink opacity-70')} aria-hidden="true" />
        </Link>
    );
}

interface ContextMenuTabProps {
    active: boolean;
    items: ContextNavItem[];
    label: string;
    pathname: string;
    searchParams: string;
    onItemClick: (event: MouseEvent<HTMLElement>) => void;
}

function ContextMenuTab({ active, items, label, pathname, searchParams, onItemClick }: ContextMenuTabProps) {
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

interface ContextNavSlotProps {
    active: boolean;
    items: ContextNavItem[];
    menuLabel: string;
    pathname: string;
    searchParams: string;
    onItemClick: (event: MouseEvent<HTMLElement>) => void;
}

function ContextNavSlot({ active, items, menuLabel, pathname, searchParams, onItemClick }: ContextNavSlotProps) {
    if (items.length === 0) return null;

    if (items.length === 1) {
        const [item] = items;
        return <ContextTabLink item={item} active={isPathActive(pathname, item.href, searchParams)} label={item.label} />;
    }

    return (
        <ContextMenuTab active={active} items={items} label={menuLabel} pathname={pathname} searchParams={searchParams} onItemClick={onItemClick} />
    );
}

function isPathActive(pathname: string, href: string, searchParams = '') {
    const [itemPathname, itemSearchParams] = href.split('?');

    if (itemSearchParams) {
        return pathname === itemPathname && searchParams === itemSearchParams;
    }

    return pathname === itemPathname || pathname.startsWith(itemPathname + '/');
}

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();
    const { openPostComposer, openSongComposer, openStoryCapture, canCompose, canComposeSong } = useComposer();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const isFeedDetailPage = pathname.startsWith('/feed/');

    const [home, playlist] = tabItems;
    const homeActive = isPathActive(pathname, home.href);
    const playlistActive = isPathActive(pathname, playlist.href);
    const showDashboardMenu = !isLoading && Boolean(activeEvent);
    const contextItems: ContextNavItem[] =
        showDashboardMenu && activeEvent
            ? isHost
                ? hostMenuItems(activeEvent.id).map((item) => ({ ...item, label: t(`hostMenu.${item.key}`) }))
                : [{ ...guestScheduleItem, icon: CalendarDays, label: t(`guestMenu.${guestScheduleItem.key}`) }]
            : [];
    const contextActive = contextItems.some((item) => isPathActive(pathname, item.href, searchParams));

    function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!isFeedDetailPage) return;

        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleDashboardMenuClick(event: MouseEvent<HTMLElement>) {
        const href = event.currentTarget.dataset.href;
        if (href) router.push(href);
    }

    return (
        <>
            <nav
                aria-label={t('mobileNavigation')}
                className="fixed bottom-0 left-1/2 z-40 grid h-16 w-9/10 -translate-x-1/2 grid-cols-3 items-center rounded-t-2xl border-t border-border bg-white/90 px-4 lg:hidden"
            >
                <div className="justify-self-start">
                    <TabLink href={home.href} icon={home.icon} label={t(`items.${home.key}`)} active={homeActive} onClick={handleHomeClick} />
                </div>

                <div className="justify-self-center">
                    <TabLink href={playlist.href} icon={playlist.icon} label={t(`items.${playlist.key}`)} active={playlistActive} />
                </div>

                <div className="justify-self-end">
                    <ContextNavSlot
                        active={contextActive}
                        items={contextItems}
                        menuLabel={t('hostMenu.manage')}
                        pathname={pathname}
                        searchParams={searchParams}
                        onItemClick={handleDashboardMenuClick}
                    />
                </div>
            </nav>

            <Menu.Root>
                <Menu.Trigger
                    aria-label={t('compose')}
                    className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md transition-transform hover:scale-105 lg:hidden"
                >
                    <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner side="top" align="end" sideOffset={8} className="z-50">
                        <Menu.Popup className="min-w-36 rounded-2xl border border-border bg-background py-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                            <Menu.Item
                                onClick={openPostComposer}
                                disabled={!canCompose}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.post')}
                                <Image
                                    src="/icons/post.svg"
                                    alt={t('composeMenu.post')}
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 transition-opacity"
                                    loading="eager"
                                />
                            </Menu.Item>
                            <Menu.Item
                                onClick={openStoryCapture}
                                disabled={!canCompose}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.story')}
                                <Image
                                    src="/icons/story.svg"
                                    alt={t('composeMenu.story')}
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 transition-opacity"
                                    loading="eager"
                                />
                            </Menu.Item>
                            <Menu.Item
                                onClick={openSongComposer}
                                disabled={!canComposeSong}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.song')}
                                <Image
                                    src="/icons/music.svg"
                                    alt={t('composeMenu.song')}
                                    width={20}
                                    height={20}
                                    className="h-5 w-5 transition-opacity"
                                    loading="eager"
                                />
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        </>
    );
}
