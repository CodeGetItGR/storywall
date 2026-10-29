'use client';

import { Bell, CalendarDays, Home as HomeIcon, Pencil, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { AccountSidebarLogo } from '@/components/account/AccountSidebarLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DesktopAccountNavLink } from '@/components/layout/DesktopAccountNavLink';
import { isEventRoute, isPathActive } from '@/components/layout/mobile-tab-bar/utils';
import { AppLink } from '@/components/ui/AppLink';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useDesktopAccountSidebar } from '@/hooks/useDesktopAccountSidebar';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent } from '@/providers/EventProvider';

export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const tAccount = useTranslations('AccountDrawer');
    const pathname = usePathname();
    const { user: authUser } = useAuth();
    const { expanded, handleMouseEnter, handleMouseLeave, togglePinned } = useDesktopAccountSidebar();
    const activeEvent = useActiveEvent();
    const { data: unreadCount = 0 } = useUnreadNotificationCount();
    // Events and profile need a real session; in the demo they would dead-end on the login page.
    const isDemoRoute = useIsDemoRoute();
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = Boolean(activeEvent) && isEventRoute(pathname);
    const accountName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') || authUser?.firstName || tAccount('fallbackName');
    // Draft and deleted events have no feed to land on; the manage page is home.
    const homeHref = activeEvent
        ? isDraft || isEventDeleted(activeEvent)
            ? routes.events.manage(activeEvent.id)
            : routes.events.feed(activeEvent.id)
        : null;
    const homeActive = Boolean(homeHref) && (isPathActive(pathname, homeHref!) || isPathActive(pathname, routes.feed));
    const eventsActive = isPathActive(pathname, routes.home);
    const profileActive = isPathActive(pathname, routes.profile);
    const notificationsActive = isPathActive(pathname, routes.notifications);

    // The avatar keeps its large picture and only its box shrinks, so the size change animates with the rail.
    const avatarClassName = cn('ring-2 ring-white/40 transition-[width,height,font-size] duration-700 ease-out', !expanded && 'h-8 w-8 text-[11px]');

    function handleRailClick(event: MouseEvent<HTMLElement>) {
        if (event.target === event.currentTarget) {
            togglePinned();
        }
    }

    return (
        <nav
            aria-label={t('mainNavigation')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleRailClick}
            data-expanded={expanded}
            className={cn(
                'desktop-account-rail fixed top-[var(--site-notice-h,0px)] left-0 z-40 hidden h-[calc(100vh-var(--site-notice-h,0px))] flex-col overflow-hidden text-[#3d332b] transition-[width,padding,color] duration-700 ease-out lg:flex',
                expanded ? 'w-80 px-5 pt-14 pb-7 text-white' : 'w-20 px-3 pt-6 pb-5',
            )}
        >
            {/* Brand */}
            <AccountSidebarLogo
                iconOnly={!expanded}
                className={cn('transition-[margin] duration-700 ease-out', expanded ? 'mb-8 ml-0' : 'mb-6 ml-3')}
            />

            {/* Identity */}
            <div
                className={cn(
                    'border-b transition-[padding,border-color] duration-700 ease-out',
                    expanded ? 'border-white/18 pb-6' : 'border-transparent pb-0',
                )}
            >
                <div className={cn('flex items-center transition-[margin,gap] duration-700 ease-out', expanded ? 'ml-0 gap-4' : 'ml-3 gap-0')}>
                    {isDemoRoute ? (
                        <Avatar
                            src={authUser?.profilePictureUrl}
                            initials={getInitials(accountName)}
                            color="rgba(255, 255, 255, 0.14)"
                            size="xl"
                            alt={accountName}
                            className={cn(avatarClassName, 'shrink-0')}
                        />
                    ) : (
                        <AppLink href={routes.profile} aria-label={tAccount('editProfile')} className="group relative shrink-0 rounded-full">
                            <Avatar
                                src={authUser?.profilePictureUrl}
                                initials={getInitials(accountName)}
                                color="rgba(255, 255, 255, 0.14)"
                                size="xl"
                                alt={accountName}
                                className={avatarClassName}
                            />
                            {expanded && (
                                <span className="shadow-soft absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary ring-2 ring-primary transition-transform group-hover:scale-105 group-focus-visible:scale-105">
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                            )}
                        </AppLink>
                    )}
                    <div className={cn('min-w-0 transition-opacity', expanded ? 'opacity-100' : 'sr-only opacity-0')}>
                        <p className="truncate text-lg font-bold">{accountName}</p>
                        {authUser?.email && <p className="truncate text-sm text-white/70">{authUser.email}</p>}
                    </div>
                </div>

                {/* Language */}
                <div
                    inert={!expanded}
                    className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-700 ease-out',
                        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div className="pt-7 pl-20">
                            <LanguageSwitcher variant="sidebar" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mt-7 no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-2">
                {showEventActions && homeHref && (
                    <DesktopAccountNavLink href={homeHref} icon={HomeIcon} label={t('items.home')} active={homeActive} expanded={expanded} />
                )}

                {!isDemoRoute && (
                    <>
                        <DesktopAccountNavLink
                            href={routes.home}
                            icon={CalendarDays}
                            label={tAccount('events')}
                            active={eventsActive}
                            expanded={expanded}
                        />
                        <DesktopAccountNavLink
                            href={routes.profile}
                            icon={UserRound}
                            label={tAccount('profile')}
                            active={profileActive}
                            expanded={expanded}
                        />
                        <DesktopAccountNavLink
                            href={routes.notifications}
                            icon={Bell}
                            label={tAccount('notifications')}
                            active={notificationsActive}
                            expanded={expanded}
                            badgeCount={unreadCount}
                        />
                    </>
                )}
            </div>

            {/* Footer */}
            <div className={cn('mt-auto flex items-center pt-6', expanded ? 'justify-between gap-4' : 'justify-center')}>
                <AccountLogoutButton variant={expanded ? 'sidebar' : 'rail'} />
            </div>
        </nav>
    );
}
