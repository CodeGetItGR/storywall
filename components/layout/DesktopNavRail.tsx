'use client';

import { Bell, Heart, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { CURRENT_USER_ID, getUser } from '@/lib/mock-data';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

const navItems = [
    { href: routes.profile, icon: Home, key: 'home', isCenter: false },
    { href: routes.notifications, icon: Bell, key: 'notifications', isCenter: false },
];

export function DesktopNavRail() {
    const t = useTranslations('DesktopNavRail');
    const pathname = usePathname();
    const user = getUser(CURRENT_USER_ID);
    const { openPostComposer } = useComposer();

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
                    const active = pathname === href || (href !== routes.feed && pathname.startsWith(href));
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
            <div className="px-4 pb-4">
                <button
                    type="button"
                    onClick={openPostComposer}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    {t('newPost')}
                </button>
            </div>

            {/* Current user */}
            <div className="border-t border-border px-4 py-4 flex items-center gap-3">
                <Avatar initials={user.initials} color={user.avatarColor} size="sm" alt={user.name} />
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-ink truncate leading-tight">{user.name}</p>
                    <p className="text-xs text-ink-muted capitalize leading-tight">{user.role}</p>
                </div>
            </div>
        </nav>
    );
}
