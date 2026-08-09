'use client';

import { AlertTriangle, CheckCircle2, Clock3, CreditCard, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import {
    useCancelSubscription,
    useCheckout,
    useEventBilling,
    useEventRefundRequests,
    useRefundEligibility,
    useRequestRefund,
    useUpgradeCheckout,
} from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventBillingResponseDto } from '@/lib/api/types';
import { billingCurrency, checkoutSuccessUrl, formatBillingDate, formatMoney, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { publicAssignablePlans, scopedPlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const ORDER_PREVIEW_COUNT = 6;

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
    const appConfigQuery = useAppConfig();
    const appConfig = appConfigQuery.data;
    const billing = useEventBilling(eventId, true);
    const refundEligibility = useRefundEligibility(eventId);
    const requestRefund = useRequestRefund(eventId);
    const renew = useCheckout(eventId, true);
    const upgradeCheckout = useUpgradeCheckout(eventId);
    const refundHistory = useEventRefundRequests(eventId);
    const toErrorMessage = useApiErrorMessage();
    const renewRetryIn = useRetryAfterCountdown(renew.error);
    const upgradeRetryIn = useRetryAfterCountdown(upgradeCheckout.error);
    const refundRetryIn = useRetryAfterCountdown(requestRefund.error);
    const [error, setError] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);
    const cancelSubscription = useCancelSubscription(eventId);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [showAllOrders, setShowAllOrders] = useState(false);
    const data = billing.data;
    const planTiers = appConfig?.planTiers ?? [];
    const eventPlans = useMemo(() => publicAssignablePlans(planTiers, 'EVENT'), [planTiers]);
    const currentPlan = useMemo(
        () => scopedPlans(planTiers, 'EVENT').find((plan) => plan.code === data?.planTierCode) ?? null,
        [data?.planTierCode, planTiers]
    );
    const upgradeTargets = useMemo(() => {
        if (!currentPlan || currentPlan.priceAmountMinor === null || !currentPlan.priceCurrency) return [];
        const currentPrice = currentPlan.priceAmountMinor;
        const currentCurrency = currentPlan.priceCurrency;
        return eventPlans.filter(
            (plan) =>
                plan.code !== currentPlan.code &&
                plan.priceAmountMinor !== null &&
                Boolean(plan.priceCurrency) &&
                plan.priceCurrency === currentCurrency &&
                plan.priceAmountMinor > currentPrice
        );
    }, [currentPlan, eventPlans]);
    const nextPlan = upgradeTargets[0];
    // Server-side history, so a decision (and its note) survives a reload — the
    // page used to only know about a request the same tab had just submitted.
    const refundRequest = refundHistory.data?.[0] ?? null;

    async function startRenewal() {
        setError(null);
        try {
            const checkout = await renew.mutateAsync();
            window.location.href = checkout.redirectUrl.includes('/checkout/success')
                ? checkoutSuccessUrl(window.location.origin, eventId, checkout.orderId)
                : checkout.redirectUrl;
        } catch (e) {
            setError(toErrorMessage(e));
        }
    }

    async function startUpgrade(planTierCode: string) {
        setError(null);
        try {
            await appConfigQuery.refetch();
        } catch {
            // Stale config is handled again by the server; this is only a freshness attempt.
        }

        try {
            const checkout = await upgradeCheckout.mutateAsync({ planTierCode });
            window.location.href = checkout.redirectUrl.includes('/checkout/success')
                ? checkoutSuccessUrl(window.location.origin, eventId, checkout.orderId, planTierCode)
                : checkout.redirectUrl;
        } catch (e) {
            const code = getErrorCode(e);
            if (code === ERROR_CODES.PLAN_TIER_NOT_AN_UPGRADE || code === ERROR_CODES.PLAN_TIER_NOT_PURCHASABLE) {
                await appConfigQuery.refetch();
            }
            setError(toErrorMessage(e));
        }
    }

    const askCancelConfirmation = useCallback(() => {
        setCancelError(null);
        setConfirmingCancel(true);
    }, []);

    const dismissCancelConfirmation = useCallback(() => setConfirmingCancel(false), []);
    const handleShowAllOrders = useCallback(() => setShowAllOrders(true), []);

    async function confirmCancelSubscription() {
        setCancelError(null);
        try {
            await cancelSubscription.mutateAsync();
            setConfirmingCancel(false);
        } catch (e) {
            // 5026 means there was nothing live to cancel — a stale tab, not a
            // failure worth alarming anyone about. Refetch and close the dialog.
            if (getErrorCode(e) === ERROR_CODES.SUBSCRIPTION_NOT_LIVE) {
                await billing.refetch();
                setConfirmingCancel(false);
                return;
            }
            // Everything else, including the 5027 "still billing" case, keeps the
            // dialog open so the retry is one tap away.
            setCancelError(toErrorMessage(e));
        }
    }

    function askRefundConfirmation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setRefundError(null);
        setConfirmingRefund(true);
    }

    async function submitRefundRequest() {
        setRefundError(null);
        try {
            await requestRefund.mutateAsync(refundReason.trim());
            setRefundReason('');
            setConfirmingRefund(false);
        } catch (e) {
            setRefundError(toErrorMessage(e));
            setConfirmingRefund(false);
        }
    }

    const cancelRefundConfirmation = useCallback(() => setConfirmingRefund(false), []);

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
            // `subscription: null` means "never subscribed" OR "subscribed, then it
            // ended at the period boundary". A renewal order is the only evidence
            // on this payload that distinguishes the two.
            hadSubscription: data.orders.some((order) => order.kind === 'RENEWAL'),
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
    const orderCoverageLabel = (order: EventBillingResponseDto['orders'][number]) => {
        if (order.coversFrom && order.coversUntil)
            return t('orders.coverageRange', { from: formatDate(order.coversFrom), until: formatDate(order.coversUntil) });
        if (order.coversUntil) return t('orders.coverageThrough', { date: formatDate(order.coversUntil) });
        if (order.kind === 'UPGRADE') return t('orders.upgradeCoverage');
        return t('orders.recordedCharge');
    };
    const hasRenewalPath = data.eventStatus !== 'DRAFT' && !coverage.unlimited && !subscription;
    const isRiskState = data.eventStatus === 'FROZEN' || data.eventStatus === 'PURGED' || !coverage.covered;
    const canUpgrade = data.eventStatus === 'ACTIVE';
    const statusIcon =
        data.eventStatus === 'ACTIVE'
            ? CheckCircle2
            : data.eventStatus === 'DRAFT'
              ? Clock3
              : data.eventStatus === 'FROZEN'
                ? AlertTriangle
                : XCircle;
    const StatusIcon = statusIcon;
    const hadSubscription = insights.hadSubscription;
    // A renewal writes an order every month, so a long-running event's history
    // grows without bound. Show a recent window until the host asks for the rest.
    const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);
    const hiddenOrderCount = data.orders.length - visibleOrders.length;
    const upgradeButtonLabel = nextPlan ? t('actions.upgradeTo', { plan: nextPlan.name }) : t('actions.renew');
    const upgradeDueLabel =
        nextPlan && currentPlan && nextPlan.priceAmountMinor !== null && currentPlan.priceAmountMinor !== null
            ? formatMoney(
                  locale,
                  nextPlan.priceAmountMinor - currentPlan.priceAmountMinor,
                  nextPlan.priceCurrency ?? currentPlan.priceCurrency ?? insights.orderCurrency
              )
            : null;

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
                        disabled={renew.isPending || renewRetryIn > 0}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {renew.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                        {renewRetryIn > 0
                            ? t('actions.retryIn', { seconds: renewRetryIn })
                            : renew.isPending
                              ? t('actions.openingCheckout')
                              : t('actions.renew')}
                    </button>
                )}
            </div>

            <section className={cn('rounded-lg border p-4', isRiskState ? 'border-amber-200 bg-amber-50/70' : 'border-border bg-card')}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                                    statusTone(data.eventStatus)
                                )}
                            >
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
                            <dd className="mt-1 text-sm font-semibold text-ink">
                                {formatMoney(locale, insights.paidTotalMinor, insights.orderCurrency)}
                            </dd>
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

            <section className="mt-6 rounded-lg border border-border bg-card px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-ink">
                            {nextPlan ? t('compare.upgradeTitle', { plan: nextPlan.name }) : t('compare.title')}
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
                            {nextPlan ? t('compare.upgradeSubtitle', { plan: data.planTierName }) : t('compare.highestPlan')}
                        </p>
                    </div>
                    <Link
                        href={routes.plans({ plan: data.planTierCode })}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white"
                    >
                        {t('compare.allPlansTitle')}
                    </Link>
                </div>

                {nextPlan && currentPlan && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{currentPlan.name}</span>
                        <span className="text-ink-faint">{t('compare.to')}</span>
                        <span className="font-semibold text-ink">{nextPlan.name}</span>
                        <span className="text-ink-faint">·</span>
                        <span>
                            {upgradeDueLabel
                                ? t('compare.upgradeCharge', {
                                      amount: upgradeDueLabel,
                                      date: formatDate(coverage.paidThrough),
                                  })
                                : t('compare.upgradeChargeUnavailable')}
                        </span>
                        <button
                            type="button"
                            onClick={() => startUpgrade(nextPlan.code)}
                            disabled={upgradeCheckout.isPending || upgradeRetryIn > 0 || !upgradeDueLabel}
                            className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink"
                        >
                            {upgradeCheckout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                            {upgradeRetryIn > 0 ? t('actions.retryIn', { seconds: upgradeRetryIn }) : upgradeButtonLabel}
                        </button>
                    </div>
                )}
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
                            {insights.lastOrder && (
                                <p className="text-xs text-ink-muted">{t('orders.lastOrder', { date: formatDate(insights.lastOrder.createdAt) })}</p>
                            )}
                        </div>
                        <div className="border-y border-border md:hidden">
                            {data.orders.length === 0 ? (
                                <p className="py-6 text-sm text-ink-muted">{t('orders.empty')}</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {visibleOrders.map((order) => (
                                        <div key={order.id} className="py-4 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                                    <p className="mt-0.5 truncate text-xs text-ink-faint">{order.id}</p>
                                                </div>
                                                <p className="shrink-0 text-right font-semibold text-ink">
                                                    {formatMoney(locale, order.amountMinor, order.currency)}
                                                </p>
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
                                                    <dd className="font-medium text-ink">{orderCoverageLabel(order)}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="hidden border-y border-border md:block">
                            <table className="w-full table-fixed text-left text-sm">
                                <thead className="text-[11px] uppercase tracking-wide text-ink-faint">
                                    <tr>
                                        <th className="py-2 pr-4 font-semibold md:w-36">{t('orders.columns.kind')}</th>
                                        <th className="px-4 py-2 font-semibold md:w-28">{t('orders.columns.status')}</th>
                                        <th className="px-4 py-2 font-semibold md:w-[38%]">{t('orders.columns.coverage')}</th>
                                        <th className="px-4 py-2 font-semibold md:w-36">{t('orders.columns.date')}</th>
                                        <th className="py-2 pl-4 text-right font-semibold md:w-28">{t('orders.columns.amount')}</th>
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
                                        visibleOrders.map((order) => (
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
                                                <td className="px-4 py-3 text-ink-muted">{orderCoverageLabel(order)}</td>
                                                <td className="px-4 py-3 text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</td>
                                                <td className="py-3 pl-4 text-right font-semibold text-ink">
                                                    {formatMoney(locale, order.amountMinor, order.currency)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {hiddenOrderCount > 0 && (
                            <button
                                type="button"
                                onClick={handleShowAllOrders}
                                className="mt-3 inline-flex min-h-11 items-center justify-center text-xs font-semibold text-primary-dark"
                            >
                                {t('orders.showAll', { count: hiddenOrderCount })}
                            </button>
                        )}
                    </div>
                </section>

                <aside className="space-y-6 lg:min-w-0">
                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('subscription.title')}</h2>
                        <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('subscription.status')}</dt>
                                <dd className="text-right font-semibold text-ink">
                                    {subscription
                                        ? subscription.cancelAtPeriodEnd
                                            ? t('subscription.notRenewing')
                                            : t(`subscriptionStatus.${subscription.status}`)
                                        : hadSubscription
                                          ? t('subscription.ended')
                                          : t('subscription.none')}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">
                                    {subscription?.cancelAtPeriodEnd ? t('subscription.liveUntil') : t('subscription.currentPeriodEnd')}
                                </dt>
                                <dd className="text-right font-semibold text-ink">{formatDate(subscription?.currentPeriodEnd ?? null)}</dd>
                            </div>
                        </dl>

                        {/* ACTIVE alone no longer means "renewing" — split the copy on the
                            flag, or a cancelled subscription reads as healthy. */}
                        {subscription && (
                            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                                {subscription.cancelAtPeriodEnd
                                    ? t('subscription.willNotRenew', { date: formatDate(subscription.currentPeriodEnd) })
                                    : subscription.status === 'PAST_DUE'
                                      ? t('subscription.pastDue')
                                      : t('subscription.renewsOn', { date: formatDate(subscription.currentPeriodEnd) })}
                            </p>
                        )}

                        {subscription && !subscription.cancelAtPeriodEnd && (
                            <div className="mt-3">
                                {confirmingCancel ? (
                                    <div className="rounded-lg bg-surface-muted p-3">
                                        <p className="text-xs leading-relaxed text-ink">
                                            {t('subscription.cancelConfirm', { date: formatDate(subscription.currentPeriodEnd) })}
                                        </p>
                                        {cancelError && <p className="mt-2 text-xs text-rose-600">{cancelError}</p>}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={confirmCancelSubscription}
                                                disabled={cancelSubscription.isPending}
                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {cancelSubscription.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                {t('subscription.cancelConfirmYes')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={dismissCancelConfirmation}
                                                className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-semibold text-ink-muted"
                                            >
                                                {t('subscription.cancelConfirmNo')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={askCancelConfirmation}
                                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-3 py-2 text-xs font-semibold text-ink sm:w-auto"
                                    >
                                        {t('subscription.cancel')}
                                    </button>
                                )}
                            </div>
                        )}

                        {subscription?.cancelAtPeriodEnd && (
                            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t('subscription.noResume')}</p>
                        )}
                        {!subscription && hasRenewalPath && (
                            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t('subscription.renewalHint')}</p>
                        )}
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('activation.title')}</h2>
                        <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.order')}</dt>
                                <dd className="max-w-36 truncate text-right font-semibold text-ink">
                                    {insights.activationOrder?.id ?? t('emptyDate')}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.paidAt')}</dt>
                                <dd className="text-right font-semibold text-ink">{formatDate(insights.activationOrder?.paidAt ?? null)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 py-3">
                                <dt className="text-ink-muted">{t('activation.amount')}</dt>
                                <dd className="text-right font-semibold text-ink">
                                    {insights.activationOrder
                                        ? formatMoney(locale, insights.activationOrder.amountMinor, insights.activationOrder.currency)
                                        : t('emptyDate')}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-ink">{t('refund.title')}</h2>
                        <div className="mt-3 border-y border-border py-3 text-sm">
                            {refundEligibility.isLoading || refundHistory.isLoading ? (
                                <p className="text-ink-muted">{t('refund.loading')}</p>
                            ) : refundRequest ? (
                                <div>
                                    <p className="font-semibold text-ink">
                                        {t('refund.requested', { status: t(`refundStatus.${refundRequest.status}`) })}
                                    </p>
                                    <p className="mt-1 text-xs text-ink-muted">
                                        {refundRequest.amountMinor !== null && refundRequest.currency
                                            ? t('refund.requestedAmount', {
                                                  amount: formatMoney(locale, refundRequest.amountMinor, refundRequest.currency),
                                              })
                                            : t('refund.requestedNoAmount')}
                                    </p>
                                    {refundRequest.decisionNote && (
                                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">{refundRequest.decisionNote}</p>
                                    )}
                                    {/* Approved but no money moved yet: say so rather than let the
                                        host assume the payment is already back. */}
                                    {refundRequest.status === 'APPROVED' && !refundRequest.providerRefunded && (
                                        <p className="mt-2 text-xs leading-relaxed text-amber-700">{t('refund.notRefundedYet')}</p>
                                    )}
                                </div>
                            ) : refundEligibility.data?.hasPendingRequest ? (
                                <p className="text-ink-muted">{t('refund.pending')}</p>
                            ) : refundEligibility.data?.eligible ? (
                                <form onSubmit={askRefundConfirmation} className="space-y-3">
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
                                    {confirmingRefund ? (
                                        <div className="rounded-lg bg-surface-muted p-3">
                                            <p className="text-xs leading-relaxed text-ink">{t('refund.confirmBody')}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={submitRefundRequest}
                                                    disabled={requestRefund.isPending || refundRetryIn > 0}
                                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {requestRefund.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                    {refundRetryIn > 0 ? t('actions.retryIn', { seconds: refundRetryIn }) : t('refund.confirmSubmit')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelRefundConfirmation}
                                                    className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-semibold text-ink-muted"
                                                >
                                                    {t('refund.confirmCancel')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={requestRefund.isPending || !refundReason.trim()}
                                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                                        >
                                            {requestRefund.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                            {requestRefund.isPending ? t('refund.submitting') : t('refund.submit')}
                                        </button>
                                    )}
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
