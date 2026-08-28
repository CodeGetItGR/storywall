'use client';

import { Menu } from '@base-ui/react/menu';
import { ArrowLeft, Camera, Menu as MenuIcon, Plus, PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';
import { PiMusicNotesPlusDuotone } from 'react-icons/pi';

import { type ContextNavItem, ContextNavSlot, isEventRoute, isPathActive, TabLink } from '@/components/layout/mobile-tab-bar';
import { useAuth } from '@/hooks/useAuth';
import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
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
    const { openPostComposer, openSongComposer, openStoryCapture, canComposePost, canComposeStory, canComposeSong } = useComposer();
    const { user } = useAuth();
    const { open: accountOpen, openAccount } = useAccountPanel();
    const { isMobileTabBarHidden } = useMobileChrome();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const accountLabel = user?.displayName ?? t('items.account');
    const isFeedDetailPage = pathname.startsWith('/feed/');
    const showEventNavigation = !isLoading && Boolean(activeEvent);
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = showEventNavigation && isEventRoute(pathname);

    const homeActive = isPathActive(pathname, homeTabItem.href);
    const availableModules = new Set(activeEvent?.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey) ?? []);
    const playlistAvailable = showEventNavigation && availableModules.has('playlist');
    const playlistActive = playlistAvailable && isPathActive(pathname, routes.tools.playlist);
    const hostItems = useHostMenuItems();
    const toolItems = useToolsMenuItems();
    const showComposerMenu = showEventActions && (canComposePost || canComposeStory || canComposeSong);
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

    function handleBackClick() {
        router.back();
    }

    const accountActive = accountOpen;
    const railColumnCount =
        1 +
        (showEventNavigation ? 1 : 0) +
        (showEventNavigation && playlistAvailable ? 1 : 0) +
        (showEventNavigation && contextItems.length > 0 ? 1 : 0);

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
                        gridTemplateColumns: showEventNavigation ? `repeat(${railColumnCount}, minmax(0, 1fr))` : 'repeat(2, minmax(0, 1fr))',
                    }}
                >
                    {!showEventNavigation ? (
                        <>
                            <button
                                type="button"
                                onClick={openAccount}
                                aria-label={t('menu')}
                                aria-haspopup="dialog"
                                aria-expanded={accountOpen}
                                className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                            >
                                <MenuIcon
                                    className={cn('h-5 w-5 transition-opacity', accountActive ? 'opacity-100' : 'opacity-55')}
                                    aria-hidden="true"
                                />
                                <span>{t('menu')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleBackClick}
                                className="flex h-full w-full items-center justify-center gap-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                            >
                                <ArrowLeft className="h-5 w-5 opacity-55" aria-hidden="true" />
                                <span>{t('back')}</span>
                            </button>
                        </>
                    ) : (
                        <>
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
                                        <Image
                                            src="/icons/profile.svg"
                                            alt={accountLabel}
                                            width={22}
                                            height={22}
                                            className="h-5.5 w-5.5 transition-all duration-200"
                                            loading="eager"
                                        />
                                    </span>
                                </button>
                            </div>

                            <div className="flex h-full items-center justify-center">
                                <TabLink
                                    href={activeEvent ? (isDraft ? routes.manage : routes.post.feed(activeEvent.id)) : homeTabItem.href}
                                    icon={homeTabItem.icon}
                                    label={t(`items.${homeTabItem.key}`)}
                                    active={homeActive}
                                    onClick={handleHomeClick}
                                />
                            </div>

                            {playlistAvailable && (
                                <div className="flex h-full items-center justify-center">
                                    <TabLink
                                        href={routes.tools.playlist}
                                        icon="/icons/music.svg"
                                        label={t('items.playlist')}
                                        active={playlistActive}
                                    />
                                </div>
                            )}

                            {contextItems.length > 0 && (
                                <div className="flex h-full items-center justify-center">
                                    <ContextNavSlot
                                        active={contextActive}
                                        items={contextItems}
                                        menuLabel={t('eventMenu')}
                                        pathname={pathname}
                                        searchParams={searchParams}
                                        onItemClick={handleDashboardMenuClick}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </nav>
            </div>

            {showComposerMenu && (
                <>
                    {/* Compose */}
                    <Menu.Root>
                        <Menu.Trigger
                            aria-label={t('compose')}
                            className={cn(
                                'group fixed right-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md transition-[bottom,opacity,transform] duration-300 ease-out hover:scale-105 data-[popup-open]:z-[60] lg:hidden',
                                isMobileTabBarHidden ? 'bottom-6 z-50' : 'bottom-20 z-30'
                            )}
                        >
                            <Plus
                                className="h-6 w-6 text-white transition-transform duration-200 ease-out group-data-popup-open:rotate-45"
                                strokeWidth={2.5}
                            />
                        </Menu.Trigger>
                        <Menu.Portal>
                            <Menu.Backdrop className="motion-menu-backdrop fixed inset-0 z-45 bg-black/10 opacity-100 backdrop-blur-[2px]" />
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
