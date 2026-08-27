'use client';

import { Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function AccountSidebarContent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('AccountDrawer');
    const tEvents = useTranslations('EventsPage');
    const { user } = useAuth();
    const accountName = user?.displayName ?? t('fallbackName');

    return (
        <div className="bg-gradient-brand flex h-full flex-col overflow-y-auto px-6 pt-16 pb-8 text-white">
            <div className="flex h-full max-w-[52vw] flex-col">
                {/* Identity */}
                <div className="flex items-center gap-4">
                    <Avatar initials={getInitials(accountName)} size="xl" alt={accountName} className="ring-2 ring-white/40" />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{accountName}</p>
                        {user?.email && <p className="truncate text-sm text-white/70">{user.email}</p>}
                    </div>
                </div>

                {/* Create event */}
                <Link
                    href={routes.events.new}
                    onClick={onCloseAction}
                    className="mt-7 flex items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    <span className="truncate">{tEvents('createEventCta')}</span>
                </Link>

                {/* Navigation */}
                <nav className="mt-8 flex flex-col gap-1">
                    <Link
                        href={routes.home}
                        onClick={onCloseAction}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
                    >
                        <Home className="h-5 w-5 shrink-0 text-white/80" aria-hidden="true" />
                        <span className="truncate">{t('home')}</span>
                    </Link>

                    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold">
                        <span className="truncate">{t('preferences.language')}</span>
                        <LanguageSwitcher />
                    </div>
                </nav>

                {/* Logout */}
                <div className="mt-auto pt-8">
                    <AccountLogoutButton onLogoutAction={onCloseAction} variant="sidebar" />
                </div>
            </div>
        </div>
    );
}
