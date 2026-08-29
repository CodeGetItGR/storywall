'use client';

import { BadgeCheck, BellRing, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { BillingOpsWebhookRow } from '@/components/admin/BillingOpsWebhookRow';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRunNotificationSweep, useSettleOrder, useUnprocessedWebhooks } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';
import { formatRecordCounts } from '@/lib/format';

export function BillingOpsPanel() {
    const t = useTranslations('AdminPage');
    const { focus } = useAdminNavigation();
    const settleOrder = useSettleOrder();
    const runSweep = useRunNotificationSweep();
    const webhooksQuery = useUnprocessedWebhooks();
    const [orderId, setOrderId] = useState('');
    const [settledOrderId, setSettledOrderId] = useState<string | null>(null);
    const [confirmSettleOpen, setConfirmSettleOpen] = useState(false);
    const [confirmSweepOpen, setConfirmSweepOpen] = useState(false);
    const [appliedFocus, setAppliedFocus] = useState(focus);

    // Adjusting during render rather than in an effect: the prefilled id has to be
    // on screen the moment the panel opens, not one paint later.
    if (focus !== appliedFocus) {
        setAppliedFocus(focus);
        if (focus?.orderId) {
            setOrderId(focus.orderId);
            setSettledOrderId(null);
        }
    }

    const handleOrderIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setOrderId(event.target.value);
        setSettledOrderId(null);
    }, []);

    const trimmedOrderId = orderId.trim();
    const orderIdIsValid = isUuid(trimmedOrderId);
    const showOrderIdError = trimmedOrderId.length > 0 && !orderIdIsValid;

    function handleSettle(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!orderIdIsValid) return;
        setConfirmSettleOpen(true);
    }

    const handleConfirmSettle = useCallback(async () => {
        setSettledOrderId(null);
        await settleOrder.mutateAsync(trimmedOrderId);
        setSettledOrderId(trimmedOrderId);
        setOrderId('');
        setConfirmSettleOpen(false);
    }, [settleOrder, trimmedOrderId]);

    const handleCloseSettleConfirm = useCallback(() => setConfirmSettleOpen(false), []);
    const handleOpenSweep = useCallback(() => setConfirmSweepOpen(true), []);
    const handleCloseSweep = useCallback(() => setConfirmSweepOpen(false), []);

    const handleRefresh = useCallback(() => {
        webhooksQuery.refetch();
    }, [webhooksQuery]);

    const handleConfirmSweep = useCallback(async () => {
        await runSweep.mutateAsync();
        setConfirmSweepOpen(false);
    }, [runSweep]);

    const webhooks = webhooksQuery.data ?? [];

    return (
        <section className="space-y-5">
            <div className="border-b border-status-warn-wash pb-3 text-sm text-status-warn">{t('billingOps.notice')}</div>

            <form onSubmit={handleSettle} className="border-b border-border pb-5">
                <h2 className="text-base font-semibold text-ink">{t('billingOps.settleTitle')}</h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('billingOps.settleSubtitle')}</p>
                <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AdminField label={t('billingOps.orderIdField')} required>
                        <input
                            value={orderId}
                            onChange={handleOrderIdChange}
                            required
                            spellCheck={false}
                            aria-invalid={showOrderIdError}
                            className={adminInputClass('font-mono')}
                            placeholder={t('billingOps.orderIdPlaceholder')}
                        />
                    </AdminField>
                    <button
                        type="submit"
                        disabled={settleOrder.isPending || !orderIdIsValid}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {settleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {t('billingOps.settle')}
                    </button>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-muted">{t('billingOps.orderIdSourceHint')}</p>
                {showOrderIdError && <p className="mt-1 text-xs font-semibold text-status-danger">{t('billingOps.orderIdInvalid')}</p>}
                {settleOrder.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
                {settledOrderId && !settleOrder.error && (
                    <p className="mt-2 text-sm text-status-good">{t('billingOps.settleSuccess', { orderId: settledOrderId })}</p>
                )}
            </form>

            <div className="border-b border-border pb-5">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-ink">{t('billingOps.webhooksTitle')}</h2>
                        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('billingOps.webhooksSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={webhooksQuery.isFetching}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                    >
                        <RefreshCw className={webhooksQuery.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                        {t('billingOps.refresh')}
                    </button>
                </div>
                {webhooksQuery.isLoading && <LoadingState label={t('billingOps.webhooksLoading')} className="justify-start" />}
                {webhooksQuery.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(webhooksQuery.error)}`)}</p>}
                {!webhooksQuery.isLoading && !webhooksQuery.error && webhooks.length === 0 && (
                    <p className="py-3 text-sm text-ink-muted">{t('billingOps.webhooksEmpty')}</p>
                )}
                <div>
                    {webhooks.map((webhook) => (
                        <BillingOpsWebhookRow key={webhook.id} webhook={webhook} />
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-base font-semibold text-ink">{t('billingOps.sweepTitle')}</h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('billingOps.sweepSubtitle')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenSweep}
                        disabled={runSweep.isPending}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {runSweep.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                        {t('billingOps.runSweep')}
                    </button>
                    {runSweep.data && (
                        <p className="text-sm text-status-good">{t('billingOps.sweepSuccess', { result: formatRecordCounts(runSweep.data) })}</p>
                    )}
                    {runSweep.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(runSweep.error)}`)}</p>}
                </div>
            </div>

            <ConfirmActionModal
                open={confirmSettleOpen}
                onCloseAction={handleCloseSettleConfirm}
                title={t('billingOps.confirmSettleTitle', { orderId: trimmedOrderId })}
                body={t('billingOps.confirmSettleBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.settle')}
                isConfirming={settleOrder.isPending}
                onConfirmAction={handleConfirmSettle}
                tone="default"
            />

            <ConfirmActionModal
                open={confirmSweepOpen}
                onCloseAction={handleCloseSweep}
                title={t('billingOps.confirmSweepTitle')}
                body={t('billingOps.confirmSweepBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.runSweep')}
                isConfirming={runSweep.isPending}
                onConfirmAction={handleConfirmSweep}
                tone="default"
            />
        </section>
    );
}
