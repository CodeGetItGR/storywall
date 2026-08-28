'use client';

import { Heart, Home as HomeIcon, Plus, UsersRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DesktopNavLink } from '@/components/layout/DesktopNavLink';
import { isEventRoute, isFeedRoute, isPathActive } from '@/components/layout/mobile-tab-bar';
import { ToolsMenu } from '@/components/layout/ToolsMenu';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent } from '@/providers/EventProvider';

export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const tAccount = useTranslations('AccountDrawer');
    const pathname = usePathname();
    const { user: authUser } = useAuth();
    const { openPostComposer, canComposePost } = useComposer();
    const activeEvent = useActiveEvent();
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = Boolean(activeEvent) && isEventRoute(pathname);
    const showComposerAction = Boolean(activeEvent) && isFeedRoute(pathname);
    const accountName = authUser?.displayName ?? tAccount('fallbackName');
    const homeHref = activeEvent ? (isDraft ? routes.events.manage(activeEvent.id) : routes.events.feed(activeEvent.id)) : null;
    const homeActive = Boolean(homeHref) && (isPathActive(pathname, homeHref!) || isPathActive(pathname, routes.feed));
    const eventsActive = isPathActive(pathname, routes.home);

    return (
        <nav
            aria-label={t('mainNavigation')}
            className="fixed left-0 top-0 h-screen w-55 bg-background border-r border-border flex-col z-40 hidden lg:flex"
        >
            {/* Logo */}
            <div className="px-5 py-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <p className="text-sm font-bold text-ink">StoryWall</p>
            </div>

            <div className="px-4 pb-2">
                <AccountLogoutButton variant="rail" />
            </div>

            {/* Nav links */}
            <div className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar">
                {showEventActions && homeHref && <DesktopNavLink href={homeHref} icon={HomeIcon} label={t('items.home')} active={homeActive} />}

                {showEventActions && !isDraft && <ToolsMenu />}

                <DesktopNavLink href={routes.home} icon={UsersRound} label={t('items.events')} active={eventsActive} />
            </div>

            {/* New Post CTA */}
            {showComposerAction && canComposePost && (
                <div className="px-4 pb-4">
                    <button
                        type="button"
                        onClick={openPostComposer}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        {t('newPost')}
                    </button>
                </div>
            )}

            <div className="px-4 pb-4">
                <LanguageSwitcher className="w-full justify-center" />
            </div>

            {/* Current user */}
            <div className="border-t border-border p-3">
                <div className="flex items-center gap-3 px-1">
                    <Avatar initials={getInitials(accountName)} size="sm" alt={accountName} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight text-ink">{accountName}</p>
                        {authUser?.email && <p className="truncate text-xs leading-tight text-ink-muted">{authUser.email}</p>}
                    </div>
                </div>
            </div>
        </nav>
    );
}
