'use client';

import { Menu as MenuIcon, Settings, Wrench } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ComposerFab, type ContextNavItem, ContextNavSlot, isFeedRoute, isPathActive, TabLink } from '@/components/layout/mobile-tab-bar';
import { useHasOpenOverlay } from '@/hooks/useOverlayPresence';
import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useAccountPanel } from '@/providers/AccountPanelProvider';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';
import { useMobileChrome } from '@/providers/MobileChromeProvider';

const homeTabItem = { href: routes.feed, icon: '/icons/home.svg', key: 'home' } as const;

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();
    const { canComposePost, canComposeStory, canComposeSong } = useComposer();
    const { open: accountOpen, openAccount } = useAccountPanel();
    const { isMobileTabBarHidden } = useMobileChrome();
    const hasOpenOverlay = useHasOpenOverlay();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const isFeedDetailPage = isFeedRoute(pathname);
    const showEventNavigation = !isLoading && Boolean(activeEvent);
    const isDraft = activeEvent?.status === 'DRAFT';
    // Draft and deleted events have no feed to land on; the manage page is home.
    const isDeleted = isEventDeleted(activeEvent);
    const homeHref = activeEvent
        ? isDraft || isDeleted
            ? routes.events.manage(activeEvent.id)
            : routes.events.feed(activeEvent.id)
        : homeTabItem.href;

    const homeActive = isPathActive(pathname, homeHref) || isPathActive(pathname, homeTabItem.href);
    const availableModules = new Set(activeEvent?.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey) ?? []);
    const playlistAvailable = availableModules.has('playlist') && !isDeleted;
    const playlistActive = playlistAvailable && Boolean(activeEvent) && isPathActive(pathname, routes.events.tools.playlist(activeEvent?.id ?? ''));
    const rsvpTabAvailable = isHost && !isDraft && !isDeleted && availableModules.has('rsvp');
    const rsvpHref = activeEvent ? routes.events.manage(activeEvent.id, { tab: 'rsvp' }) : '';
    const rsvpActive = rsvpTabAvailable && isPathActive(pathname, rsvpHref, searchParams);
    const hostItems = useHostMenuItems();
    const toolItems = useToolsMenuItems();
    // The FAB only belongs on the feed itself: any open modal, sheet, viewer or
    // menu popover animates it off screen until the last one closes.
    const showComposerFab = isFeedRoute(pathname) && (canComposePost || canComposeStory || canComposeSong);
    const contextItems: ContextNavItem[] = activeEvent
        ? isHost
            ? [
                  // Help links into the manage page's Help section, and the gallery QR only makes
                  // sense once the event is live — both hidden for draft events.
                  ...(isDraft ? hostItems.filter((item) => item.key !== 'help' && item.key !== 'galleryQr') : hostItems),
                  // Hosts answer RSVPs from the dashboard's RSVP section, not the guest self-RSVP tool.
                  ...(isDraft ? [] : toolItems.filter((item) => item.key !== 'rsvp')),
              ]
            : toolItems
        : [];
    const contextActive = contextItems.some((item) => isPathActive(pathname, item.href, searchParams));
    const ContextTriggerIcon = isHost ? Settings : Wrench;
    const contextMenuLabel = isHost ? t('eventMenu') : t('toolsMenu');

    function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!isFeedDetailPage) return;

        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleDashboardMenuClick(event: MouseEvent<HTMLElement>) {
        const href = event.currentTarget.dataset.href;
        if (href) router.push(href);
    }

    if (!showEventNavigation) return null;

    const accountActive = accountOpen;
    const railColumnCount = 1 + 1 + (playlistAvailable ? 1 : 0) + (rsvpTabAvailable ? 1 : 0) + (contextItems.length > 0 ? 1 : 0);

    return (
        <>
            {/* Navigation */}
            <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 lg:hidden">
                <nav
                    aria-label={t('eventNavigation')}
                    aria-hidden={isMobileTabBarHidden}
                    className={cn(
                        'overflow-hiddenborder grid h-16 min-w-0 rounded-t-xl border-b-0 border-border shadow-[0_-4px_18px_rgba(36,31,26,0.08)] backdrop-blur transition-[opacity,transform,box-shadow] duration-300 ease-out',
                        isMobileTabBarHidden ? 'pointer-events-none translate-y-4 opacity-0 shadow-none' : 'translate-y-0 opacity-100',
                    )}
                    style={{
                        backgroundImage:
                            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 58%, rgba(255,255,255,0.72) 100%)',
                        gridTemplateColumns: `repeat(${railColumnCount}, minmax(0, 1fr))`,
                    }}
                >
                    {/* Home */}
                    <div className="flex h-full items-center justify-center">
                        <TabLink
                            href={homeHref}
                            icon={homeTabItem.icon}
                            label={t(`items.${homeTabItem.key}`)}
                            active={homeActive}
                            onClick={handleHomeClick}
                        />
                    </div>

                    {/* Music */}
                    {playlistAvailable && activeEvent && (
                        <div className="flex h-full items-center justify-center">
                            <TabLink
                                href={routes.events.tools.playlist(activeEvent.id)}
                                icon="/icons/music.svg"
                                label={t('items.playlist')}
                                active={playlistActive}
                            />
                        </div>
                    )}

                    {/* RSVP */}
                    {rsvpTabAvailable && (
                        <div className="flex h-full items-center justify-center">
                            <TabLink href={rsvpHref} icon="/icons/rsvp.png" label={t('items.rsvp')} active={rsvpActive} />
                        </div>
                    )}

                    {/* Event menu */}
                    {contextItems.length > 0 && (
                        <div className="flex h-full items-center justify-center">
                            <ContextNavSlot
                                active={contextActive}
                                forceMenu
                                TriggerIcon={ContextTriggerIcon}
                                items={contextItems}
                                menuLabel={contextMenuLabel}
                                pathname={pathname}
                                searchParams={searchParams}
                                onItemClick={handleDashboardMenuClick}
                            />
                        </div>
                    )}

                    {/* Account menu */}
                    <div className="flex h-full items-center justify-center">
                        <button
                            type="button"
                            onClick={openAccount}
                            aria-label={t('openAccount')}
                            aria-haspopup="dialog"
                            aria-expanded={accountOpen}
                            className="flex h-full w-full items-center justify-center transition-colors hover:bg-surface-muted"
                        >
                            <span
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center transition-all duration-200',
                                    accountActive ? 'scale-105 opacity-100' : 'scale-100 opacity-50',
                                )}
                            >
                                <MenuIcon className="h-5.5 w-5.5 text-ink transition-all duration-200" aria-hidden="true" />
                            </span>
                        </button>
                    </div>
                </nav>
            </div>

            {/* Compose */}
            {showComposerFab && <ComposerFab hidden={hasOpenOverlay} />}
        </>
    );
}
