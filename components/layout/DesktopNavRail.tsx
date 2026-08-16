'use client';

import { Heart, Home, Plus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AccountLogoutButton } from '@/components/profile/AccountLogoutButton';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent } from '@/providers/EventProvider';

function isPathActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(href + '/');
}

function isEventRoute(pathname: string) {
    return (
        pathname === routes.feed ||
        pathname.startsWith(routes.feed + '/') ||
        pathname === routes.manage ||
        pathname.startsWith(routes.manage + '/') ||
        pathname === routes.tools.root ||
        pathname.startsWith(routes.tools.root + '/') ||
        pathname.startsWith('/story/') ||
        pathname.startsWith('/post/') ||
        pathname.startsWith('/events/')
    );
}

export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const tProfile = useTranslations('ProfilePage');
    const pathname = usePathname();
    const { user: authUser } = useAuth();
    const { openPostComposer, canComposePost } = useComposer();
    const activeEvent = useActiveEvent();
    const isDraft = activeEvent?.status === 'DRAFT';
    const showEventActions = Boolean(activeEvent) && isEventRoute(pathname);
    const accountName = authUser?.displayName ?? tProfile('fallbackName');
    const navItems = [
        ...(activeEvent ? [{ href: isDraft ? routes.manage : routes.post.feed(activeEvent.id), icon: Home, key: 'home' }] : []),
        { href: routes.profile, icon: UserRound, key: 'profile' },
    ];

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
                <div className="leading-tight">
                    <p className="text-sm font-bold text-ink">StoryWall</p>
                    <p className="text-[11px] text-ink-faint">{t('coupleNames')}</p>
                </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar">
                {navItems.map(({ href, icon: Icon, key }) => {
                    const active = isPathActive(pathname, href) || (key === 'home' && isPathActive(pathname, routes.feed));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                            )}
                        >
                            <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-primary' : '')} strokeWidth={active ? 2.5 : 1.8} />
                            {t(`items.${key}`)}
                        </Link>
                    );
                })}
            </div>

            {/* New Post CTA */}
            {showEventActions && canComposePost && (
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
                <AccountLogoutButton variant="rail" />
            </div>
        </nav>
    );
}
