'use client';

    import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import {MdLogout} from "react-icons/md";

export function AccountLogoutButton({ onLogoutAction, variant = 'default' }: { onLogoutAction?: () => void; variant?: 'default' | 'rail' }) {
    const t = useTranslations('ProfilePage');
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
                    'flex items-center gap-2 rounded-xl text-sm font-semibold text-ink transition-colors hover:bg-surface-muted',
                    variant === 'rail'
                        ? 'min-h-9 justify-start px-3 py-2 text-ink-muted hover:text-ink'
                        : 'min-h-11 justify-center border border-border bg-background px-4 py-2.5'
                )}
            >
                <MdLogout className="h-6 w-6" aria-hidden="true" />
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
