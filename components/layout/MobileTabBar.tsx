'use client';

import { Menu } from '@base-ui/react/menu';
import { Camera, Menu as MenuIcon, Plus, PlusCircle, Settings, Wrench } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CSSProperties, type MouseEvent, useEffect, useState } from 'react';
import { PiMusicNotesPlusDuotone } from 'react-icons/pi';

import { type ContextNavItem, ContextNavSlot, isFeedRoute, isPathActive, TabLink } from '@/components/layout/mobile-tab-bar';
import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useAccountPanel } from '@/providers/AccountPanelProvider';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';
import { useMobileChrome } from '@/providers/MobileChromeProvider';

const homeTabItem = { href: routes.feed, icon: '/icons/home.svg', key: 'home' } as const;

export function MobileTabBar() {
    const [composerMenuOpen, setComposerMenuOpen] = useState(false);
    const [composerButtonLowered, setComposerButtonLowered] = useState(false);
    const t = useTranslations('MobileTabBar');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams().toString();
    const { openPostComposer, openSongComposer, openStoryCapture, canComposePost, canComposeStory, canComposeSong } = useComposer();
    const { open: accountOpen, openAccount } = useAccountPanel();
    const { isMobileTabBarHidden } = useMobileChrome();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const isFeedDetailPage = isFeedRoute(pathname);
    const showEventNavigation = !isLoading && Boolean(activeEvent);
    const isDraft = activeEvent?.status === 'DRAFT';
    const homeHref = activeEvent ? (isDraft ? routes.events.manage(activeEvent.id) : routes.events.feed(activeEvent.id)) : homeTabItem.href;

    const homeActive = isPathActive(pathname, homeHref) || isPathActive(pathname, homeTabItem.href);
    const availableModules = new Set(activeEvent?.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey) ?? []);
    const playlistAvailable = showEventNavigation && availableModules.has('playlist');
    const playlistActive = playlistAvailable && Boolean(activeEvent) && isPathActive(pathname, routes.events.tools.playlist(activeEvent?.id ?? ''));
    const rsvpTabAvailable = showEventNavigation && isHost && !isDraft;
    const rsvpHref = activeEvent ? routes.events.manage(activeEvent.id, { tab: 'rsvp' }) : '';
    const rsvpActive = rsvpTabAvailable && isPathActive(pathname, rsvpHref, searchParams);
    const hostItems = useHostMenuItems();
    const toolItems = useToolsMenuItems();
    const showComposerMenu = showEventNavigation && isFeedRoute(pathname) && (canComposePost || canComposeStory || canComposeSong);
    const contextItems: ContextNavItem[] =
        showEventNavigation && activeEvent
            ? isHost
                ? [
                      // Help links into the manage page's Help section, which is hidden for draft events.
                      ...(isDraft ? hostItems.filter((item) => item.key !== 'help') : hostItems),
                      // Hosts answer RSVPs from the dashboard's RSVP section, not the guest self-RSVP tool.
                      ...(isDraft ? [] : toolItems.filter((item) => item.key !== 'rsvp')),
                  ]
                : toolItems
            : [];
    const contextActive = contextItems.some((item) => isPathActive(pathname, item.href, searchParams));
    const ContextTriggerIcon = isHost ? Settings : Wrench;
    const contextMenuLabel = isHost ? t('eventMenu') : t('toolsMenu');

    useEffect(() => {
        const timeoutId = window.setTimeout(
            () => {
                setComposerButtonLowered(isMobileTabBarHidden);
            },
            isMobileTabBarHidden ? 100 : 0
        );

        return () => window.clearTimeout(timeoutId);
    }, [isMobileTabBarHidden]);

    function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!isFeedDetailPage) return;

        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleDashboardMenuClick(event: MouseEvent<HTMLElement>) {
        const href = event.currentTarget.dataset.href;
        if (href) router.push(href);
    }

    function handleComposerMenuClose() {
        setComposerMenuOpen(false);
    }

    const accountActive = accountOpen;
    const railColumnCount =
        1 +
        (showEventNavigation ? 1 : 0) +
        (showEventNavigation && playlistAvailable ? 1 : 0) +
        (rsvpTabAvailable ? 1 : 0) +
        (showEventNavigation && contextItems.length > 0 ? 1 : 0);
    const composerButtonStyle = {
        transform: composerButtonLowered ? 'translate3d(0, 4rem, 0)' : 'translate3d(0, 0, 0)',
        transition: 'transform 300ms cubic-bezier(0.77, 0, 0.175, 1)',
    } satisfies CSSProperties;

    return (
        <>
            {/* Navigation */}
            <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 lg:hidden">
                <nav
                    aria-label={t('eventNavigation')}
                    aria-hidden={isMobileTabBarHidden}
                    className={cn(
                        'grid h-16 min-w-0 overflow-hidden rounded-t-lg border border-b-0 border-border shadow-[0_-4px_18px_rgba(36,31,26,0.08)] backdrop-blur transition-[opacity,transform,box-shadow] duration-300 ease-out',
                        isMobileTabBarHidden ? 'pointer-events-none translate-y-4 opacity-0 shadow-none' : 'translate-y-0 opacity-100'
                    )}
                    style={{
                        backgroundImage:
                            'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 58%, rgba(255,255,255,0.72) 100%)',
                        gridTemplateColumns: showEventNavigation ? `repeat(${railColumnCount}, minmax(0, 1fr))` : 'repeat(1, minmax(0, 1fr))',
                    }}
                >
                    {!showEventNavigation ? (
                        <button
                            type="button"
                            onClick={openAccount}
                            aria-label={t('menu')}
                            aria-haspopup="dialog"
                            aria-expanded={accountOpen}
                            className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                        >
                            <MenuIcon className={cn('h-5 w-5 transition-opacity', accountActive ? 'opacity-100' : 'opacity-55')} aria-hidden="true" />
                            <span>{t('menu')}</span>
                        </button>
                    ) : (
                        <>
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
                                            accountActive ? 'scale-105 opacity-100' : 'scale-100 opacity-50'
                                        )}
                                    >
                                        <MenuIcon className="h-5.5 w-5.5 text-ink transition-all duration-200" aria-hidden="true" />
                                    </span>
                                </button>
                            </div>
                        </>
                    )}
                </nav>
            </div>

            {showComposerMenu && (
                <>
                    {/* Compose */}
                    <Menu.Root open={composerMenuOpen} onOpenChange={setComposerMenuOpen}>
                        <Menu.Trigger
                            aria-label={t('compose')}
                            className={cn(
                                'group fixed right-4 bottom-20 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md will-change-transform lg:hidden',
                                composerMenuOpen && 'invisible'
                            )}
                            style={composerButtonStyle}
                        >
                            <span className="flex h-full w-full items-center justify-center transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
                                <Plus
                                    className="h-6 w-6 text-white transition-transform duration-200 ease-out group-data-popup-open:rotate-45"
                                    strokeWidth={2.5}
                                />
                            </span>
                        </Menu.Trigger>
                        <Menu.Portal>
                            <Menu.Backdrop className="motion-menu-backdrop fixed inset-0 z-45 bg-black/10 opacity-100 backdrop-blur-[2px]" />
                            {/* Compose close control */}
                            <button
                                type="button"
                                aria-label={t('compose')}
                                onClick={handleComposerMenuClose}
                                className="group fixed right-4 bottom-20 z-60 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md will-change-transform lg:hidden"
                                style={composerButtonStyle}
                            >
                                <span className="flex h-full w-full items-center justify-center transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
                                    <Plus className="h-6 w-6 rotate-45 text-white" strokeWidth={2.5} />
                                </span>
                            </button>
                            <Menu.Positioner side="top" align="end" sideOffset={8} className="z-50">
                                <Menu.Popup className="motion-popover flex w-46 flex-col gap-2 border-0 bg-transparent p-0 shadow-none outline-none">
                                    {canComposePost && (
                                        <Menu.Item
                                            onClick={openPostComposer}
                                            className="motion-menu-item flex min-h-14 cursor-pointer items-center justify-between rounded-[1.45rem] border border-[#efc0dc] bg-background px-5 text-sm font-medium text-ink shadow-[0_6px_18px_rgba(36,31,26,0.08)] outline-none hover:-translate-y-0.5 hover:border-[#f0b47f]"
                                        >
                                            {t('composeMenu.post')}
                                            <Camera className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                                        </Menu.Item>
                                    )}
                                    {canComposeStory && (
                                        <Menu.Item
                                            onClick={openStoryCapture}
                                            className="motion-menu-item flex min-h-14 cursor-pointer items-center justify-between rounded-[1.45rem] border border-[#efc0dc] bg-background px-5 text-sm font-medium text-ink shadow-[0_6px_18px_rgba(36,31,26,0.08)] outline-none hover:-translate-y-0.5 hover:border-[#f0b47f]"
                                        >
                                            {t('composeMenu.story')}
                                            <PlusCircle className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                                        </Menu.Item>
                                    )}
                                    {canComposeSong && (
                                        <Menu.Item
                                            onClick={openSongComposer}
                                            className="motion-menu-item flex min-h-14 cursor-pointer items-center justify-between rounded-[1.45rem] border border-[#efc0dc] bg-background px-5 text-sm font-medium text-ink shadow-[0_6px_18px_rgba(36,31,26,0.08)] outline-none hover:-translate-y-0.5 hover:border-[#f0b47f]"
                                        >
                                            {t('composeMenu.song')}
                                            <PiMusicNotesPlusDuotone className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                                        </Menu.Item>
                                    )}
                                </Menu.Popup>
                            </Menu.Positioner>
                        </Menu.Portal>
                    </Menu.Root>
                </>
            )}
        </>
    );
}
