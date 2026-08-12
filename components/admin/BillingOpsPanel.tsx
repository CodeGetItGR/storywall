'use client';

import { BadgeCheck, BellRing, Check, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useReplayWebhook, useRunNotificationSweep, useSettleOrder, useUnprocessedWebhooks } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { UnprocessedWebhookDto } from '@/lib/api/types';
import { formatRecordCounts } from '@/lib/format';

function SettleButton({ orderId, label }: { orderId: string; label: string }) {
    const settleOrder = useSettleOrder();
    const t = useTranslations('AdminPage');
    const [confirmOpen, setConfirmOpen] = useState(false);

    function handleOpen() {
        setConfirmOpen(true);
    }

    function handleClose() {
        setConfirmOpen(false);
    }

    async function handleConfirm() {
        await settleOrder.mutateAsync(orderId);
        setConfirmOpen(false);
    }

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

    function handleOpenReplay() {
        setConfirmReplayOpen(true);
    }

    function handleCloseReplay() {
        setConfirmReplayOpen(false);
    }

    async function handleReplay() {
        if (!webhook.provider || !providerEventId) return;
        await replayWebhook.mutateAsync({ provider: webhook.provider, providerEventId });
        setConfirmReplayOpen(false);
    }

    return (
        <div className="flex flex-col gap-2.5 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{webhook.eventType ?? t('billingOps.unknownEventType')}</p>
                <p className="mt-0.5 truncate text-xs text-ink-faint">{[webhook.provider, webhook.id].filter(Boolean).join(' • ')}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{t('billingOps.receivedAt', { date: new Date(webhook.receivedAt).toLocaleString() })}</p>
                {webhook.orderId && <p className="mt-0.5 truncate text-xs text-ink-muted">{t('billingOps.orderId', { orderId: webhook.orderId })}</p>}
                {!webhook.replayable && <p className="mt-0.5 text-xs text-ink-faint">{t('billingOps.notReplayable')}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
        </div>
    );
}

export function BillingOpsPanel() {
    const t = useTranslations('AdminPage');
    const settleOrder = useSettleOrder();
    const runSweep = useRunNotificationSweep();
    const webhooksQuery = useUnprocessedWebhooks();
    const [settledOrderId, setSettledOrderId] = useState<string | null>(null);
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
    const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);
    const [confirmSweepOpen, setConfirmSweepOpen] = useState(false);

    function handleSettle(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const orderId = String(new FormData(form).get('orderId') ?? '').trim();
        if (!orderId) return;
        setPendingOrderId(orderId);
        setPendingForm(form);
    }

    async function handleConfirmSettle() {
        if (!pendingOrderId) return;
        setSettledOrderId(null);
        await settleOrder.mutateAsync(pendingOrderId);
        setSettledOrderId(pendingOrderId);
        pendingForm?.reset();
        setPendingOrderId(null);
        setPendingForm(null);
    }

    function handleClosePendingSettle() {
        setPendingOrderId(null);
        setPendingForm(null);
    }

    function handleRefresh() {
        webhooksQuery.refetch();
    }

    function handleOpenSweep() {
        setConfirmSweepOpen(true);
    }

    function handleCloseSweep() {
        setConfirmSweepOpen(false);
    }

    async function handleConfirmSweep() {
        await runSweep.mutateAsync();
        setConfirmSweepOpen(false);
    }

    const webhooks = webhooksQuery.data ?? [];

    return (
        <section className="space-y-5">
            <div className="border-b border-amber-200 pb-3 text-sm text-amber-800">{t('billingOps.notice')}</div>

            <div className="border-b border-border pb-4">
                <h2 className="text-base font-semibold text-ink">{t('billingOps.sweepTitle')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('billingOps.sweepSubtitle')}</p>
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

            <form onSubmit={handleSettle} className="border-b border-border pb-4">
                <h2 className="text-base font-semibold text-ink">{t('billingOps.settleTitle')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('billingOps.settleSubtitle')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AdminField label={t('billingOps.orderIdField')}>
                        <input name="orderId" required className={adminInputClass()} placeholder={t('billingOps.orderIdPlaceholder')} />
                    </AdminField>
                    <button
                        type="submit"
                        disabled={settleOrder.isPending}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {settleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {t('billingOps.settle')}
                    </button>
                </div>
                {settleOrder.error && <p className="mt-2 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
                {settledOrderId && !settleOrder.error && (
                    <p className="mt-2 text-sm text-emerald-700">{t('billingOps.settleSuccess', { orderId: settledOrderId })}</p>
                )}
            </form>

            <ConfirmActionModal
                open={Boolean(pendingOrderId)}
                onClose={handleClosePendingSettle}
                title={pendingOrderId ? t('billingOps.confirmSettleTitle', { orderId: pendingOrderId }) : ''}
                body={t('billingOps.confirmSettleBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.settle')}
                isConfirming={settleOrder.isPending}
                onConfirm={handleConfirmSettle}
                tone="default"
            />

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-ink">{t('billingOps.webhooksTitle')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('billingOps.webhooksSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={webhooksQuery.isFetching}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                    >
                        <RefreshCw className={webhooksQuery.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                        {t('billingOps.refresh')}
                    </button>
                </div>
                {webhooksQuery.isLoading && <p className="text-sm text-ink-muted">{t('billingOps.webhooksLoading')}</p>}
                {webhooksQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(webhooksQuery.error)}`)}</p>}
                {!webhooksQuery.isLoading && !webhooksQuery.error && webhooks.length === 0 && (
                    <p className="border-b border-border py-3 text-sm text-ink-muted">{t('billingOps.webhooksEmpty')}</p>
                )}
                <div className="space-y-2">
                    {webhooks.map((webhook) => (
                        <WebhookRow key={webhook.id} webhook={webhook} />
                    ))}
                </div>
            </div>
        </section>
    );
}
