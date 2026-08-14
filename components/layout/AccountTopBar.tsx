'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function AccountTopBar() {
    const t = useTranslations('AccountTopBar');
    const router = useRouter();
    const { user, logout } = useAuth();
    const accountLabel = user?.displayName ?? t('fallbackName');

    async function handleLogout() {
        await logout();
        router.replace(routes.login);
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar initials={getInitials(accountLabel)} size="sm" alt={accountLabel} />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-ink">{accountLabel}</p>
                    <p className="truncate text-xs leading-tight text-ink-muted">{user?.email ?? t('profile')}</p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-full bg-surface-muted px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
            >
                <LogOut className="h-4 w-4" strokeWidth={2.2} />
                {t('logout')}
            </button>
        </header>
    );
}
