'use client';

import { Menu } from '@base-ui/react/menu';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useState } from 'react';

import { type ContextNavItem, ContextNavSlot, isEventRoute, isPathActive, TabLink } from '@/components/layout/mobile-tab-bar';
import { AccountDrawer } from '@/components/profile';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

const homeTabItem = { href: routes.feed, icon: '/icons/home.svg', key: 'home' } as const;

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const [accountOpen, setAccountOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();
    const { openPostComposer, openSongComposer, openStoryCapture, canComposePost, canComposeStory, canComposeSong } = useComposer();
    const { user } = useAuth();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const accountLabel = user?.displayName ?? t('items.profile');
    const isFeedDetailPage = pathname.startsWith('/feed/');
    const showEventNavigation = !isLoading && Boolean(activeEvent);
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = showEventNavigation && isEventRoute(pathname);
    const profileActive = pathname === routes.profile || pathname.startsWith(routes.profile + '/');

    const homeActive = isPathActive(pathname, homeTabItem.href);
    const availableModules = new Set(activeEvent?.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey) ?? []);
    const playlistAvailable = showEventNavigation && availableModules.has('playlist');
    const playlistActive = playlistAvailable && isPathActive(pathname, routes.tools.playlist);
    const hostItems = useHostMenuItems();
    const toolItems = useToolsMenuItems();
    const contextItems: ContextNavItem[] =
        showEventNavigation && activeEvent
            ? isHost
                ? [
                      ...hostItems,
                      // Hosts answer RSVPs from the dashboard's RSVP section, not the guest self-RSVP tool.
                      ...(isDraft ? [] : toolItems.filter((item) => item.key !== 'rsvp')),
                  ]
                : toolItems
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

    const handleOpenAccount = useCallback(() => setAccountOpen(true), []);
    const handleCloseAccount = useCallback(() => setAccountOpen(false), []);

    if (profileActive) return null;

    return (
        <>
            <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-lg -translate-x-1/2 items-end gap-2 px-3 lg:hidden">
                <button
                    type="button"
                    onClick={handleOpenAccount}
                    aria-label={t('openAccount')}
                    aria-expanded={accountOpen}
                    aria-controls="mobile-account-drawer"
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-t-2xl border border-b-0 border-border shadow-[0_-4px_18px_rgba(36,31,26,0.08)] transition-colors ${
                        accountOpen || profileActive ? 'bg-primary-light' : 'bg-card hover:bg-surface-muted'
                    }`}
                >
                    <Avatar
                        initials={getInitials(accountLabel)}
                        size="sm"
                        alt={accountLabel}
                        className={accountOpen || profileActive ? 'ring-2 ring-primary/40' : undefined}
                    />
                </button>

                <nav
                    aria-label={t('eventNavigation')}
                    className="grid h-16 min-w-0 flex-1 grid-cols-3 items-center rounded-t-2xl border border-b-0 border-border bg-white/90 px-3 shadow-[0_-4px_18px_rgba(36,31,26,0.06)] backdrop-blur"
                >
                    <div className="justify-self-start">
                        {showEventNavigation && (
                            <TabLink
                                href={activeEvent ? (isDraft ? routes.manage : routes.post.feed(activeEvent.id)) : homeTabItem.href}
                                icon={homeTabItem.icon}
                                label={t(`items.${homeTabItem.key}`)}
                                active={homeActive}
                                onClick={handleHomeClick}
                            />
                        )}
                    </div>

                    <div className="justify-self-center">
                        {playlistAvailable && (
                            <TabLink href={routes.tools.playlist} icon="/icons/music.svg" label={t('items.playlist')} active={playlistActive} />
                        )}
                    </div>
                    <div className="justify-self-end">
                        <ContextNavSlot
                            active={contextActive}
                            items={contextItems}
                            menuLabel={t('eventMenu')}
                            pathname={pathname}
                            searchParams={searchParams}
                            onItemClick={handleDashboardMenuClick}
                        />
                    </div>
                </nav>
            </div>

            <div id="mobile-account-drawer">
                <AccountDrawer open={accountOpen} onClose={handleCloseAccount} />
            </div>

            {showEventActions && (canComposePost || canComposeStory || canComposeSong) && (
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
                                {canComposePost && (
                                    <Menu.Item
                                        onClick={openPostComposer}
                                        className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted"
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
                                )}
                                {canComposeStory && (
                                    <Menu.Item
                                        onClick={openStoryCapture}
                                        className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted"
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
                                )}
                                {canComposeSong && (
                                    <Menu.Item
                                        onClick={openSongComposer}
                                        className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted"
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
                                )}
                            </Menu.Popup>
                        </Menu.Positioner>
                    </Menu.Portal>
                </Menu.Root>
            )}
        </>
    );
}
