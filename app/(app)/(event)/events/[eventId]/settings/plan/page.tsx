'use client';

import { AlertTriangle, CheckCircle2, Clock3, CreditCard, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { useCheckout, useEventBilling, useRefundEligibility, useRequestRefund } from '@/hooks/useBilling';
import { getErrorMessage } from '@/lib/api/errors';
import type { EventBillingResponseDto, RefundRequestResponseDto } from '@/lib/api/types';
import { billingCurrency, checkoutSuccessUrl, formatBillingDate, formatMoney, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function statusTone(status: EventBillingResponseDto['eventStatus']) {
    if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (status === 'DRAFT') return 'bg-sky-50 text-sky-700 ring-sky-200';
    if (status === 'FROZEN') return 'bg-amber-50 text-amber-800 ring-amber-200';
    return 'bg-rose-50 text-rose-700 ring-rose-200';
}

export default function EventPlanSettingsPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    const billing = useEventBilling(eventId, true);
    const refundEligibility = useRefundEligibility(eventId);
    const requestRefund = useRequestRefund(eventId);
    const renew = useCheckout(eventId, true);
    const [error, setError] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [refundRequest, setRefundRequest] = useState<RefundRequestResponseDto | null>(null);
    const data = billing.data;

    async function startRenewal() {
        setError(null);
        try {
            const checkout = await renew.mutateAsync();
            window.location.href = checkout.redirectUrl.includes('/checkout/success')
                ? checkoutSuccessUrl(window.location.origin, eventId, checkout.orderId)
                : checkout.redirectUrl;
        } catch (e) {
            setError(getErrorMessage(e));
        }
    }

    async function submitRefundRequest(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRefundError(null);
        try {
            const result = await requestRefund.mutateAsync(refundReason.trim());
            setRefundRequest(result);
            setRefundReason('');
        } catch (e) {
            setRefundError(getErrorMessage(e));
        }
    }

    function handleRefundReasonChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setRefundReason(event.target.value);
    }

    const insights = useMemo(() => {
        if (!data) return null;
        const lastOrder = newestBillingOrder(data.orders);
        const activationOrder = newestBillingOrder(data.orders, 'ACTIVATION');
        const pendingOrders = data.orders.filter((order) => order.status === 'PENDING');

        return {
            lastOrder,
            activationOrder,
            pendingOrders,
            paidTotalMinor: paidBillingTotal(data.orders),
            orderCurrency: billingCurrency(data.orders),
        };
    }, [data]);

    if (billing.isLoading) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
                <div className="mt-6 h-64 animate-pulse rounded-lg bg-surface-muted" />
            </main>
        );
    }

    if (billing.error || !data || !insights) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-10">
                <p className="text-sm text-rose-600">{t('loadError')}</p>
            </main>
        );
    }

    const coverage = data.coverage;
    const subscription = data.subscription;
    const formatDate = (value: string | null) => formatBillingDate(locale, value) ?? t('emptyDate');
    const hasRenewalPath = data.eventStatus !== 'DRAFT' && !coverage.unlimited && !subscription;
    const isRiskState = data.eventStatus === 'FROZEN' || data.eventStatus === 'PURGED' || !coverage.covered;
    const statusIcon = data.eventStatus === 'ACTIVE' ? CheckCircle2 : data.eventStatus === 'DRAFT' ? Clock3 : data.eventStatus === 'FROZEN' ? AlertTriangle : XCircle;
    const StatusIcon = statusIcon;

    return (
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Link href={routes.manage} className="text-xs font-semibold text-primary-dark">
                        {t('backToEvent')}
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-ink">{t('title')}</h1>
                    <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
                </div>
                {hasRenewalPath && (
                    <button
                        type="button"
                        onClick={startRenewal}
                        disabled={renew.isPending}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {renew.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                        {renew.isPending ? t('actions.openingCheckout') : t('actions.renew')}
                    </button>
                )}
            </div>

            <section className={cn('rounded-lg border p-4', isRiskState ? 'border-amber-200 bg-amber-50/70' : 'border-border bg-card')}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTone(data.eventStatus))}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {t(`eventStatus.${data.eventStatus}`)}
                            </span>
                            <span className="text-sm font-semibold text-ink">{data.planTierName}</span>
                            <span className="text-xs text-ink-muted">{data.planTierCode}</span>
                        </div>
                        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
                            {data.eventStatus === 'PURGED'
                                ? t('summary.PURGED')
                                : data.eventStatus === 'FROZEN'
                                  ? t('summary.FROZEN', { date: formatDate(coverage.paidThrough) })
                                  : data.eventStatus === 'DRAFT'
                                    ? t('summary.DRAFT')
                                    : coverage.unlimited
                                      ? t('summary.ACTIVE_UNLIMITED')
                                      : t('summary.ACTIVE', { date: formatDate(coverage.paidThrough) })}
                        </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 md:min-w-64 md:grid-cols-2 md:gap-x-6 md:text-right">
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('facts.covered')}</dt>
                            <dd className="mt-1 text-sm font-semibold text-ink">{coverage.covered ? t('yes') : t('no')}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('facts.totalPaid')}</dt>
                            <dd className="mt-1 text-sm font-semibold text-ink">{formatMoney(locale, insights.paidTotalMinor, insights.orderCurrency)}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('facts.orders')}</dt>
                            <dd className="mt-1 text-sm font-semibold text-ink">{data.orders.length}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('facts.pending')}</dt>
                            <dd className="mt-1 text-sm font-semibold text-ink">{insights.pendingOrders.length}</dd>
                        </div>
                    </dl>
                </div>
                {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
            </section>

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <section className="min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-ink">{t('timeline.title')}</h2>
                        {coverage.unlimited && <span className="text-xs font-semibold text-emerald-700">{t('timeline.unlimited')}</span>}
                    </div>
                    <div className="divide-y divide-border border-y border-border">
                        {[
                            { key: 'paidThrough', value: coverage.paidThrough },
                            { key: 'freezesAt', value: coverage.freezesAt },
                            { key: 'purgesAt', value: coverage.purgesAt },
                        ].map((item) => (
                            <div key={item.key} className="grid gap-1 py-3 text-sm sm:grid-cols-[9rem_1fr] sm:gap-4">
                                <div>
                                    <p className="font-semibold text-ink">{t(`timeline.${item.key}.label`)}</p>
                                    <p className="mt-0.5 text-xs text-ink-muted">{t(`timeline.${item.key}.hint`)}</p>
                                </div>
                                <p className="text-ink">{coverage.unlimited ? t('notApplicable') : formatDate(item.value)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-7">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-bold text-ink">{t('orders.title')}</h2>
                            {insights.lastOrder && <p className="text-xs text-ink-muted">{t('orders.lastOrder', { date: formatDate(insights.lastOrder.createdAt) })}</p>}
                        </div>
                        <div className="border-y border-border md:hidden">
                            {data.orders.length === 0 ? (
                                <p className="py-6 text-sm text-ink-muted">{t('orders.empty')}</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {data.orders.map((order) => (
                                        <div key={order.id} className="py-4 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                                    <p className="mt-0.5 truncate text-xs text-ink-faint">{order.id}</p>
                                                </div>
                                                <p className="shrink-0 text-right font-semibold text-ink">{formatMoney(locale, order.amountMinor, order.currency)}</p>
                                            </div>
                                            <dl className="mt-3 grid gap-2">
                                                <div className="flex justify-between gap-3">
                                                    <dt className="text-ink-muted">{t('orders.columns.status')}</dt>
                                                    <dd className="font-medium text-ink">{t(`orderStatus.${order.status}`)}</dd>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <dt className="text-ink-muted">{t('orders.columns.date')}</dt>
                                                    <dd className="text-right font-medium text-ink">{formatDate(order.paidAt ?? order.createdAt)}</dd>
                                                </div>
                                                <div className="grid gap-1">
                                                    <dt className="text-ink-muted">{t('orders.columns.coverage')}</dt>
                                                    <dd className="font-medium text-ink">
                                                        {order.coversFrom || order.coversUntil
                                                            ? t('orders.coverageRange', { from: formatDate(order.coversFrom), until: formatDate(order.coversUntil) })
                                                            : t('notApplicable')}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="hidden overflow-x-auto border-y border-border md:block">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead className="text-[11px] uppercase tracking-wide text-ink-faint">
                                    <tr>
                                        <th className="py-2 pr-4 font-semibold">{t('orders.columns.kind')}</th>
                                        <th className="px-4 py-2 font-semibold">{t('orders.columns.status')}</th>
                                        <th className="px-4 py-2 font-semibold">{t('orders.columns.coverage')}</th>
                                        <th className="px-4 py-2 font-semibold">{t('orders.columns.date')}</th>
                                        <th className="py-2 pl-4 text-right font-semibold">{t('orders.columns.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-sm text-ink-muted">
                                                {t('orders.empty')}
                                            </td>
                                        </tr>
                                    ) : (
                                        data.orders.map((order) => (
                                            <tr key={order.id}>
                                                <td className="py-3 pr-4 font-medium text-ink">
                                                    {t(`orders.kind.${order.kind}`)}
                                                    <p className="mt-0.5 max-w-36 truncate text-xs font-normal text-ink-faint">{order.id}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
                                                        {t(`orderStatus.${order.status}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-ink-muted">
                                                    {order.coversFrom || order.coversUntil
                                                        ? t('orders.coverageRange', { from: formatDate(order.coversFrom), until: formatDate(order.coversUntil) })
                                                        : t('notApplicable')}
                                                </td>
                                                <td className="px-4 py-3 text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</td>
                                                <td className="py-3 pl-4 text-right font-semibold text-ink">{formatMoney(locale, order.amountMinor, order.currency)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <aside className="space-y-6 lg:min-w-0">
                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('subscription.title')}</h2>
                        <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('subscription.status')}</dt>
                                <dd className="font-semibold text-ink">{subscription ? t(`subscriptionStatus.${subscription.status}`) : t('subscription.none')}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('subscription.currentPeriodEnd')}</dt>
                                <dd className="text-right font-semibold text-ink">{formatDate(subscription?.currentPeriodEnd ?? null)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('subscription.cancelledAt')}</dt>
                                <dd className="text-right font-semibold text-ink">{formatDate(subscription?.cancelledAt ?? null)}</dd>
                            </div>
                        </dl>
                        {!subscription && hasRenewalPath && <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t('subscription.renewalHint')}</p>}
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('activation.title')}</h2>
                        <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.order')}</dt>
                                <dd className="max-w-36 truncate text-right font-semibold text-ink">{insights.activationOrder?.id ?? t('emptyDate')}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.paidAt')}</dt>
                                <dd className="text-right font-semibold text-ink">{formatDate(insights.activationOrder?.paidAt ?? null)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.amount')}</dt>
                                <dd className="text-right font-semibold text-ink">
                                    {insights.activationOrder ? formatMoney(locale, insights.activationOrder.amountMinor, insights.activationOrder.currency) : t('emptyDate')}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('refund.title')}</h2>
                        <div className="mt-3 border-y border-border py-3 text-sm">
                            {refundEligibility.isLoading ? (
                                <p className="text-ink-muted">{t('refund.loading')}</p>
                            ) : refundRequest ? (
                                <div>
                                    <p className="font-semibold text-ink">{t('refund.requested', { status: t(`refundStatus.${refundRequest.status}`) })}</p>
                                    <p className="mt-1 text-xs text-ink-muted">
                                        {refundRequest.amountMinor !== null && refundRequest.currency
                                            ? t('refund.requestedAmount', { amount: formatMoney(locale, refundRequest.amountMinor, refundRequest.currency) })
                                            : t('refund.requestedNoAmount')}
                                    </p>
                                </div>
                            ) : refundEligibility.data?.hasPendingRequest ? (
                                <p className="text-ink-muted">{t('refund.pending')}</p>
                            ) : refundEligibility.data?.eligible ? (
                                <form onSubmit={submitRefundRequest} className="space-y-3">
                                    <p className="text-ink-muted">{t('refund.eligible')}</p>
                                    <label className="block">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('refund.reason')}</span>
                                        <textarea
                                            value={refundReason}
                                            onChange={handleRefundReasonChange}
                                            rows={3}
                                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                                            placeholder={t('refund.reasonPlaceholder')}
                                        />
                                    </label>
                                    {refundError && <p className="text-xs text-rose-600">{refundError}</p>}
                                    <button
                                        type="submit"
                                        disabled={requestRefund.isPending || !refundReason.trim()}
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                                    >
                                        {requestRefund.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        {requestRefund.isPending ? t('refund.submitting') : t('refund.submit')}
                                    </button>
                                </form>
                            ) : (
                                <div>
                                    <p className="text-ink-muted">{t('refund.notEligible')}</p>
                                    {refundEligibility.data?.reasons.length ? (
                                        <ul className="mt-2 space-y-1 text-xs text-ink-faint">
                                            {refundEligibility.data.reasons.map((reason) => (
                                                <li key={reason}>{reason}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    );
}
