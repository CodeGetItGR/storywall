'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useSettleOrder } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function BillingOpsSettleButton({ orderId, label }: { orderId: string; label: string }) {
    const settleOrder = useSettleOrder();
    const t = useTranslations('AdminPage');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleOpen = useCallback(() => setConfirmOpen(true), []);
    const handleClose = useCallback(() => setConfirmOpen(false), []);

    const handleConfirm = useCallback(async () => {
        await settleOrder.mutateAsync(orderId);
        setConfirmOpen(false);
    }, [orderId, settleOrder]);

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleOpen}
                disabled={settleOrder.isPending || settleOrder.isSuccess}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
                {settleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {settleOrder.isSuccess ? t('billingOps.settled') : label}
            </button>
            {settleOrder.error && <p className="text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={handleClose}
                title={t('billingOps.confirmSettleTitle', { orderId })}
                body={t('billingOps.confirmSettleBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.settle')}
                isConfirming={settleOrder.isPending}
                onConfirmAction={handleConfirm}
                tone="default"
            />
        </div>
    );
}
