'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdLogout } from 'react-icons/md';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAuth } from '@/hooks/useAuth';
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
    const router = useRouter();
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

    return (
        <>
            <button
                type="button"
                onClick={handleLogoutClick}
                className={cn(
                    'flex items-center gap-2 rounded-xl text-sm font-semibold transition-colors',
                    variant === 'rail' && 'min-h-9 justify-start px-3 py-2 text-ink-muted hover:bg-surface-muted hover:text-ink',
                    variant === 'default' && 'min-h-11 justify-center border border-border bg-background px-4 py-2.5 text-ink hover:bg-surface-muted',
                    variant === 'sidebar' && 'min-h-11 w-full justify-start gap-3 px-3 py-3 text-white hover:bg-white/10'
                )}
            >
                <MdLogout className={variant === 'sidebar' ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
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
