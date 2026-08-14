'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function AccountLogoutButton({ onLogout, variant = 'default' }: { onLogout?: () => void; variant?: 'default' | 'rail' }) {
    const t = useTranslations('ProfilePage');
    const router = useRouter();
    const { logout } = useAuth();

    async function handleLogout() {
        onLogout?.();
        await logout();
        router.replace(routes.login);
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            className={cn(
                'flex w-full items-center gap-2 rounded-xl text-sm font-semibold text-ink transition-colors hover:bg-surface-muted',
                variant === 'rail'
                    ? 'mt-3 min-h-9 justify-start px-3 py-2 text-ink-muted hover:text-ink'
                    : 'min-h-11 justify-center border border-border bg-background px-4 py-2.5'
            )}
        >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('logout')}
        </button>
    );
}
