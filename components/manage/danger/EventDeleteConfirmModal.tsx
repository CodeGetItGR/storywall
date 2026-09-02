'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

export function EventDeleteConfirmModal({
    open,
    password,
    onPasswordChangeAction,
    passwordInvalid,
    deleteError,
    isConfirming,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    password: string;
    onPasswordChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    passwordInvalid: boolean;
    deleteError: string | null;
    isConfirming: boolean;
    onCloseAction: () => void;
    onConfirmAction: () => void;
}) {
    const t = useTranslations('ManagePage');

    return (
        <ConfirmActionModal
            open={open}
            title={t('settings.dangerZone.confirmTitle')}
            size="md"
            body={
                <div className="flex flex-col gap-3">
                    <p>{t('settings.dangerZone.confirmBody')}</p>

                    <label className="flex flex-col gap-1.5 text-left">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('settings.dangerZone.password.label')}</span>
                        <input
                            type="password"
                            value={password}
                            onChange={onPasswordChangeAction}
                            autoComplete="current-password"
                            className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {passwordInvalid && (
                            <span className="text-xs text-rose-600">{t('settings.dangerZone.password.errors.currentPasswordInvalid')}</span>
                        )}
                    </label>

                    {deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}
                </div>
            }
            confirmLabel={t('settings.dangerZone.confirmAction')}
            cancelLabel={t('settings.dangerZone.cancelAction')}
            onCloseAction={onCloseAction}
            onConfirmAction={onConfirmAction}
            isConfirming={isConfirming}
            confirmDisabled={password.length === 0}
        />
    );
}
