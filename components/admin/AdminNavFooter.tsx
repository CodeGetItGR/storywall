'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// The sidebar's foot: language, who is signed in, and sign-out.
export function AdminNavFooter({
    email,
    userId,
    onLogoutAction,
}: {
    email?: string | null;
    userId?: string | null;
    onLogoutAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage');
    const initials = (email ?? '?').slice(0, 2).toUpperCase();

    function handleLogoutClick() {
        void onLogoutAction();
    }

    return (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
            <div className="px-2.5">
                <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-2 px-2.5">
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10.5px] font-extrabold text-ink-muted">
                    {initials}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12.3px] font-bold text-ink">{email ?? t('layout.console')}</p>
                    {userId && <p className="truncate text-[10.8px] text-ink-faint">{userId}</p>}
                </div>
                <button
                    type="button"
                    onClick={handleLogoutClick}
                    aria-label={t('layout.signOut')}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <LogOut className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
