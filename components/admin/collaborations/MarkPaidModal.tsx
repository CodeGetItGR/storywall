'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type CurrencyAmount, formatCurrencyAmounts } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function MarkPaidModal({
    open,
    count,
    totals,
    reference,
    canConfirm,
    isConfirming,
    error,
    onReferenceChangeAction,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    count: number;
    totals: CurrencyAmount[];
    reference: string;
    canConfirm: boolean;
    isConfirming: boolean;
    error: unknown;
    onReferenceChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onCloseAction: () => void;
    onConfirmAction: () => Promise<void>;
}) {
    const t = useTranslations('AdminPage.collaborations.earnings');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <ConfirmActionModal
            open={open}
            onCloseAction={onCloseAction}
            title={t('confirmTitle')}
            body={
                <div className="space-y-3">
                    <p>{t('confirmBody', { count, amount: formatCurrencyAmounts(locale, totals) })}</p>
                    <AdminField label={t('payoutReference')} required>
                        <input value={reference} onChange={onReferenceChangeAction} maxLength={200} className={adminInputClass()} />
                    </AdminField>
                    {Boolean(error) && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(error)}`)}</p>}
                </div>
            }
            cancelLabel={tAdmin('cancel')}
            confirmLabel={t('markPaid')}
            confirmDisabled={!canConfirm}
            isConfirming={isConfirming}
            onConfirmAction={onConfirmAction}
            tone="default"
        />
    );
}
