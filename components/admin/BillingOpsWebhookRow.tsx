'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { BillingOpsSettleButton } from '@/components/admin/BillingOpsSettleButton';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useReplayWebhook } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { UnprocessedWebhookDto } from '@/lib/api/types';

export function BillingOpsWebhookRow({ webhook }: { webhook: UnprocessedWebhookDto }) {
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
                            {replayWebhook.error && (
                                <p className="text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(replayWebhook.error)}`)}</p>
                            )}
                        </div>
                    )}
                    {webhook.orderId ? (
                        <BillingOpsSettleButton orderId={webhook.orderId} label={t('billingOps.settleThis')} />
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
                onCloseAction={handleCloseReplay}
                title={t('billingOps.confirmReplayTitle')}
                body={t('billingOps.confirmReplayBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('billingOps.replay')}
                isConfirming={replayWebhook.isPending}
                onConfirmAction={handleReplay}
                tone="default"
            />
        </article>
    );
}
