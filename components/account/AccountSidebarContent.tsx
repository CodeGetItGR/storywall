'use client';

import { CalendarDays, Layers3, UserRound, WalletCards } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { AccountSidebarNavLink } from '@/components/account/AccountSidebarNavLink';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function AccountSidebarContent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('AccountDrawer');
    const { user } = useAuth();
    const accountName = user?.displayName ?? t('fallbackName');

    return (
        <div className="bg-gradient-brand flex h-full flex-col overflow-y-auto px-6 pt-16 pb-8 text-white">
            <div className="flex h-full max-w-[50vw] flex-col">
                <section className={'flex flex-col pb-3 border-b border-border'}>
                    {/* Identity */}
                    <div className="flex items-center gap-4">
                        <Avatar initials={getInitials(accountName)} size="xl" alt={accountName} className="ring-2 ring-white/40" />
                        <div className="min-w-0">
                            <p className="truncate text-lg font-bold">{accountName}</p>
                            {user?.email && <p className="truncate text-sm text-white/70">{user.email}</p>}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="mt-7 pl-20">
                        <LanguageSwitcher variant="sidebar" />
                    </div>
                </section>

                {/* Navigation */}
                <nav className="mt-7 flex max-w-[52vw] flex-col gap-1">
                    <AccountSidebarNavLink href={routes.home} icon={CalendarDays} label={t('events')} onNavigateAction={onCloseAction} />
                    <AccountSidebarNavLink href={routes.plans()} icon={WalletCards} label={t('plans')} onNavigateAction={onCloseAction} />
                    <AccountSidebarNavLink href={routes.modules} icon={Layers3} label={t('modules')} onNavigateAction={onCloseAction} />
                    <AccountSidebarNavLink href={routes.profile} icon={UserRound} label={t('profile')} onNavigateAction={onCloseAction} />
                </nav>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                    <AccountLogoutButton onLogoutAction={onCloseAction} variant="sidebar" />
                </div>
            </div>
        </div>
    );
}
