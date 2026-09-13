'use client';

import { CalendarDays, Home as HomeIcon, Layers3, Pencil, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DesktopAccountNavLink } from '@/components/layout/DesktopAccountNavLink';
import { isEventRoute, isPathActive } from '@/components/layout/mobile-tab-bar';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useDesktopAccountSidebar } from '@/hooks/useDesktopAccountSidebar';
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
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = Boolean(activeEvent) && isEventRoute(pathname);
    const accountName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') || authUser?.firstName || tAccount('fallbackName');
    const homeHref = activeEvent ? (isDraft ? routes.events.manage(activeEvent.id) : routes.events.feed(activeEvent.id)) : null;
    const homeActive = Boolean(homeHref) && (isPathActive(pathname, homeHref!) || isPathActive(pathname, routes.feed));
    const eventsActive = isPathActive(pathname, routes.home);
    const plansActive = isPathActive(pathname, routes.plans());
    const modulesActive = isPathActive(pathname, routes.modules);

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
                'desktop-account-rail fixed top-0 left-0 z-40 hidden h-screen flex-col overflow-hidden text-[#3d332b] transition-[width,padding,color] duration-700 ease-out lg:flex',
                expanded ? 'w-80 px-5 pt-14 pb-7 text-white' : 'w-20 px-3 pt-6 pb-5'
            )}
        >
            {/* Identity */}
            <div className={cn('border-white/18 transition-[padding,border-color]', expanded ? 'border-b pb-6' : 'border-b-0 pb-0')}>
                <div className={cn('flex items-center', expanded ? 'gap-4' : 'justify-center')}>
                    <Link href={routes.profile} aria-label={tAccount('editProfile')} className="group relative shrink-0 rounded-full">
                        <Avatar
                            src={authUser?.profilePictureUrl}
                            initials={getInitials(accountName)}
                            size={expanded ? 'xl' : 'sm'}
                            alt={accountName}
                            className={cn('ring-2 transition-[box-shadow] duration-700 ease-out', expanded ? 'ring-white/40' : 'ring-[#594833]/45')}
                        />
                        {expanded && (
                            <span className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary shadow-soft ring-2 ring-primary transition-transform group-hover:scale-105 group-focus-visible:scale-105">
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                        )}
                    </Link>
                    <div className={cn('min-w-0 transition-opacity', expanded ? 'opacity-100' : 'sr-only opacity-0')}>
                        <p className="truncate text-lg font-bold">{accountName}</p>
                        {authUser?.email && <p className="truncate text-sm text-white/70">{authUser.email}</p>}
                    </div>
                </div>

                {expanded && (
                    <div className="mt-7 pl-20">
                        <LanguageSwitcher variant="sidebar" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className={cn('no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-2', expanded ? 'mt-7 max-w-52' : 'mt-8')}>
                {showEventActions && homeHref && (
                    <DesktopAccountNavLink href={homeHref} icon={HomeIcon} label={t('items.home')} active={homeActive} expanded={expanded} />
                )}

                <DesktopAccountNavLink href={routes.home} icon={CalendarDays} label={tAccount('events')} active={eventsActive} expanded={expanded} />
                <DesktopAccountNavLink
                    href={routes.plans({ eventId: activeEvent?.id })}
                    icon={WalletCards}
                    label={tAccount('plans')}
                    active={plansActive}
                    expanded={expanded}
                />
                <DesktopAccountNavLink href={routes.modules} icon={Layers3} label={tAccount('modules')} active={modulesActive} expanded={expanded} />
            </div>

            {/* Footer */}
            <div className={cn('mt-auto flex items-center pt-6', expanded ? 'justify-between gap-4' : 'justify-center')}>
                <AccountLogoutButton variant={expanded ? 'sidebar' : 'rail'} />
            </div>
        </nav>
    );
}
