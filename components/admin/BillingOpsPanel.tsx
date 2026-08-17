'use client';

import { BadgeCheck, BellRing, Check, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useReplayWebhook, useRunNotificationSweep, useSettleOrder, useUnprocessedWebhooks } from '@/hooks/useAdmin';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';
import type { UnprocessedWebhookDto } from '@/lib/api/types';
import { formatRecordCounts } from '@/lib/format';

function SettleButton({ orderId, label }: { orderId: string; label: string }) {
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
            {settleOrder.error && <p className="text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
            <ConfirmActionModal
                open={confirmOpen}
                onClose={handleClose}
                title={t('billingOps.confirmSettleTitle', { orderId })}
                body={t('billingOps.confirmSettleBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.settle')}
                isConfirming={settleOrder.isPending}
                onConfirm={handleConfirm}
                tone="default"
            />
        </div>
    );
}

function WebhookRow({ webhook }: { webhook: UnprocessedWebhookDto }) {
    const t = useTranslations('AdminPage');
    const replayWebhook = useReplayWebhook();
    const [confirmReplayOpen, setConfirmReplayOpen] = useState(false);
    const providerEventId = webhook.providerEventId ?? webhook.id;
    const canReplay = webhook.replayable && Boolean(webhook.provider && providerEventId);

    const handleOpenReplay = useCallback(() => setConfirmReplayOpen(true), []);
    const handleCloseReplay = useCallback(() => setConfirmReplayOpen(false), []);

    const handleReplay = useCallback(async () => {
        if (!webhook.provider || !providerEventId) return;
        await replayWebhook.mutateAsync({ provider: webhook.provider, providerEventId });
        setConfirmReplayOpen(false);
    }, [providerEventId, replayWebhook, webhook.provider]);

    return (
        <article className="border-b border-border py-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{webhook.eventType ?? t('billingOps.unknownEventType')}</p>
                        {webhook.provider && (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold uppercase text-ink-muted">
                                {webhook.provider}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                        {t('billingOps.receivedAt', { date: new Date(webhook.receivedAt).toLocaleString() })}
                    </p>
                    {webhook.payloadSummary && (
                        <p className="mt-1 max-w-2xl truncate font-mono text-[11px] text-ink-faint" title={webhook.payloadSummary}>
                            {webhook.payloadSummary}
                        </p>
                    )}
                    {!webhook.replayable && <p className="mt-1 text-xs text-ink-faint">{t('billingOps.notReplayable')}</p>}
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                    {canReplay && (
                        <div className="flex flex-col items-end gap-1">
                            <button
                                type="button"
                                onClick={handleOpenReplay}
                                disabled={replayWebhook.isPending || replayWebhook.isSuccess}
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-50"
                            >
                                {replayWebhook.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                {replayWebhook.isSuccess ? t('billingOps.replayed') : t('billingOps.replay')}
                            </button>
                            {replayWebhook.error && <p className="text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(replayWebhook.error)}`)}</p>}
                        </div>
                    )}
                    {webhook.orderId ? (
                        <SettleButton orderId={webhook.orderId} label={t('billingOps.settleThis')} />
                    ) : (
                        <p className="text-xs text-ink-faint">{t('billingOps.noOrderRef')}</p>
                    )}
                </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {webhook.orderId && <AdminIdentifier label={t('identifiers.orderId')} value={webhook.orderId} />}
                {webhook.providerEventId && <AdminIdentifier label={t('identifiers.providerEventId')} value={webhook.providerEventId} />}
                <AdminIdentifier label={t('identifiers.deliveryId')} value={webhook.id} />
            </div>

            <ConfirmActionModal
                open={confirmReplayOpen}
                onClose={handleCloseReplay}
                title={t('billingOps.confirmReplayTitle')}
                body={t('billingOps.confirmReplayBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.replay')}
                isConfirming={replayWebhook.isPending}
                onConfirm={handleReplay}
                tone="default"
            />
        </article>
    );
}

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
            <div className="border-b border-amber-200 pb-3 text-sm text-amber-800">{t('billingOps.notice')}</div>

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
                {showOrderIdError && <p className="mt-1 text-xs font-semibold text-rose-600">{t('billingOps.orderIdInvalid')}</p>}
                {settleOrder.error && <p className="mt-2 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
                {settledOrderId && !settleOrder.error && (
                    <p className="mt-2 text-sm text-emerald-700">{t('billingOps.settleSuccess', { orderId: settledOrderId })}</p>
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
                {webhooksQuery.isLoading && <p className="text-sm text-ink-muted">{t('billingOps.webhooksLoading')}</p>}
                {webhooksQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(webhooksQuery.error)}`)}</p>}
                {!webhooksQuery.isLoading && !webhooksQuery.error && webhooks.length === 0 && (
                    <p className="py-3 text-sm text-ink-muted">{t('billingOps.webhooksEmpty')}</p>
                )}
                <div>
                    {webhooks.map((webhook) => (
                        <WebhookRow key={webhook.id} webhook={webhook} />
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
                        <p className="text-sm text-emerald-700">{t('billingOps.sweepSuccess', { result: formatRecordCounts(runSweep.data) })}</p>
                    )}
                    {runSweep.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(runSweep.error)}`)}</p>}
                </div>
            </div>

            <ConfirmActionModal
                open={confirmSettleOpen}
                onClose={handleCloseSettleConfirm}
                title={t('billingOps.confirmSettleTitle', { orderId: trimmedOrderId })}
                body={t('billingOps.confirmSettleBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.settle')}
                isConfirming={settleOrder.isPending}
                onConfirm={handleConfirmSettle}
                tone="default"
            />

            <ConfirmActionModal
                open={confirmSweepOpen}
                onClose={handleCloseSweep}
                title={t('billingOps.confirmSweepTitle')}
                body={t('billingOps.confirmSweepBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.runSweep')}
                isConfirming={runSweep.isPending}
                onConfirm={handleConfirmSweep}
                tone="default"
            />
        </section>
    );
}
