'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function VoidEarningModal({
    open,
    reason,
    canConfirm,
    isConfirming,
    error,
    onReasonChangeAction,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    reason: string;
    canConfirm: boolean;
    isConfirming: boolean;
    error: unknown;
    onReasonChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations.void');
    const tAdmin = useTranslations('AdminPage');

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t('confirmTitle')}
            body={
                <div className="space-y-3">
                    <p>{t('confirmBody')}</p>
                    <AdminField label={t('reason')} required>
                        <textarea value={reason} onChange={onReasonChangeAction} maxLength={1000} className={adminInputClass('min-h-24 resize-y')} />
                    </AdminField>
                    {Boolean(error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t('action')}
            confirmDisabled={!canConfirm}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
        />
    );
}
