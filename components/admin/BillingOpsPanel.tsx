'use client';

import { BadgeCheck, Check, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useSettleOrder, useUnprocessedWebhooks } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { UnprocessedWebhookDto } from '@/lib/api/types';

function SettleButton({ orderId, label }: { orderId: string; label: string }) {
    const settleOrder = useSettleOrder();
    const t = useTranslations('AdminPage');

    const handleClick = useCallback(() => {
        settleOrder.mutate(orderId);
    }, [orderId, settleOrder]);

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={settleOrder.isPending || settleOrder.isSuccess}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
                {settleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {settleOrder.isSuccess ? t('billingOps.settled') : label}
            </button>
            {settleOrder.error && <p className="text-xs text-rose-600">{t(`errors.${adminErrorMessageKey(settleOrder.error)}`)}</p>}
        </div>
    );
}

function WebhookRow({ webhook }: { webhook: UnprocessedWebhookDto }) {
    const t = useTranslations('AdminPage');

    return (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{webhook.eventType ?? t('billingOps.unknownEventType')}</p>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                    {[webhook.provider, webhook.id].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{t('billingOps.receivedAt', { date: new Date(webhook.receivedAt).toLocaleString() })}</p>
                {webhook.orderId && <p className="mt-0.5 truncate text-xs text-ink-muted">{t('billingOps.orderId', { orderId: webhook.orderId })}</p>}
            </div>
            {webhook.orderId ? (
                <SettleButton orderId={webhook.orderId} label={t('billingOps.settleThis')} />
            ) : (
                <p className="text-xs text-ink-faint">{t('billingOps.noOrderRef')}</p>
            )}
        </div>
    );
}

export function BillingOpsPanel() {
    const t = useTranslations('AdminPage');
    const settleOrder = useSettleOrder();
    const webhooksQuery = useUnprocessedWebhooks();
    const [settledOrderId, setSettledOrderId] = useState<string | null>(null);

    async function handleSettle(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const orderId = String(formData.get('orderId') ?? '').trim();
        if (!orderId) return;
        setSettledOrderId(null);
        await settleOrder.mutateAsync(orderId);
        setSettledOrderId(orderId);
        form.reset();
    }

    const handleRefresh = useCallback(() => {
        webhooksQuery.refetch();
    }, [webhooksQuery]);

    const webhooks = webhooksQuery.data ?? [];

    return (
        <section className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{t('billingOps.notice')}</div>

            <form onSubmit={handleSettle} className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                <h2 className="text-base font-semibold text-ink">{t('billingOps.settleTitle')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('billingOps.settleSubtitle')}</p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AdminField label={t('billingOps.orderIdField')}>
                        <input name="orderId" required className={adminInputClass()} placeholder="1f3c…" />
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
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-border disabled:opacity-50"
                    >
                        <RefreshCw className={webhooksQuery.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                        {t('billingOps.refresh')}
                    </button>
                </div>
                {webhooksQuery.isLoading && <p className="text-sm text-ink-muted">{t('billingOps.webhooksLoading')}</p>}
                {webhooksQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(webhooksQuery.error)}`)}</p>}
                {!webhooksQuery.isLoading && !webhooksQuery.error && webhooks.length === 0 && (
                    <p className="rounded-xl border border-border bg-card p-3 text-sm text-ink-muted">{t('billingOps.webhooksEmpty')}</p>
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
