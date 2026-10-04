'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdLogout } from 'react-icons/md';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAuth } from '@/hooks/useAuth';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function AccountLogoutButton({
    onLogoutAction,
    variant = 'default',
}: {
    onLogoutAction?: () => void;
    variant?: 'default' | 'rail' | 'sidebar';
}) {
    const t = useTranslations('AccountDrawer');
    const tDemo = useTranslations('Demo');
    const locale = useLocale() as Locale;
    const router = useRouter();
    // The demo has no real session to end; leaving it is the exit.
    const isDemoRoute = usePathname()?.startsWith('/demo') ?? false;
    const { logout } = useAuth();
    const [confirmOpen, setConfirmOpen] = useState(false);

    function handleLogoutClick() {
        setConfirmOpen(true);
    }

    function handleConfirmClose() {
        setConfirmOpen(false);
    }

    async function handleConfirmLogout() {
        try {
            await logout();
        } finally {
            setConfirmOpen(false);
            onLogoutAction?.();
            router.replace(routes.login);
        }
    }

    const className = cn(
        'flex items-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-700 ease-out',
        variant === 'rail' && 'h-11 w-11 justify-center bg-white/10 p-0 text-white/88 ring-1 ring-white/14 hover:bg-white/16 hover:text-white',
        variant === 'default' && 'min-h-11 justify-center border border-border bg-background px-4 py-2.5 text-ink hover:bg-surface-muted',
        variant === 'sidebar' &&
            'min-h-11 w-fit justify-start gap-2.5 rounded-full bg-white/8 px-4 py-2.5 text-white ring-1 ring-white/12 transition-[background-color,transform,box-shadow] hover:bg-white/14 active:scale-[0.99]',
    );
    const iconClassName = variant === 'sidebar' ? 'h-5 w-5' : 'h-6 w-6';

    if (isDemoRoute) {
        return (
            <Link
                href={getPublicLandingPath(locale)}
                aria-label={variant === 'sidebar' ? undefined : tDemo('exitDemo')}
                onClick={onLogoutAction}
                className={className}
            >
                <MdLogout className={iconClassName} aria-hidden="true" />
                {variant === 'sidebar' && tDemo('exitDemo')}
            </Link>
        );
    }

    return (
        <>
            <button type="button" onClick={handleLogoutClick} aria-label={variant === 'sidebar' ? undefined : t('logout')} className={className}>
                <MdLogout className={iconClassName} aria-hidden="true" />
                {variant === 'sidebar' && t('logout')}
            </button>

            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={handleConfirmClose}
                onConfirmAction={handleConfirmLogout}
                title={t('logoutConfirmTitle')}
                body={t('logoutConfirmBody')}
                confirmLabel={t('logoutConfirmConfirm')}
                cancelLabel={t('logoutConfirmCancel')}
                tone="danger"
            />
        </>
    );
}
