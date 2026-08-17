'use client';

import { AlertTriangle, CheckCircle2, Clock3, Loader2, PackagePlus, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { ChangeEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { PageBackLink } from '@/components/ui/PageBackLink';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCancelSubscription, useEventBilling, useEventRefundRequests, useRefundEligibility, useRequestRefund } from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventBillingResponseDto } from '@/lib/api/types';
import { billingCurrency, discountedAmountMinor, formatBillingDate, formatMoney, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { publicAssignablePlans, scopedPlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { getEventBillingStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const ORDER_PREVIEW_COUNT = 6;

export default function EventPlanSettingsPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    const tPageError = useTranslations('PageErrorState.billing');
    const tCommon = useTranslations('Common');
    const appConfigQuery = useAppConfig();
    const appConfig = appConfigQuery.data;
    const billing = useEventBilling(eventId, true);
    const refundEligibility = useRefundEligibility(eventId);
    const requestRefund = useRequestRefund(eventId);
    const refundHistory = useEventRefundRequests(eventId);
    const toErrorMessage = useApiErrorMessage();
    const refundRetryIn = useRetryAfterCountdown(requestRefund.error);
    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);
    const cancelSubscription = useCancelSubscription(eventId);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [showAllOrders, setShowAllOrders] = useState(false);
    const [renderedAtMs] = useState(() => Date.now());
    const data = billing.data;
    const planTiers = useMemo(() => appConfig?.planTiers ?? [], [appConfig?.planTiers]);
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
    const paidAddonOffers = useMemo(
        () =>
            (appConfig?.paidServices ?? []).filter(
                (service) => service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false)
            ),
        [appConfig?.paidServices, currentPlan]
    );
    // Server-side history, so a decision (and its note) survives a reload - the
    // page used to only know about a request the same tab had just submitted.
    const refundRequest = refundHistory.data?.[0] ?? null;

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
            // 5026 means there was nothing live to cancel - a stale tab, not a
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

    function askRefundConfirmation(event: React.SubmitEvent<HTMLFormElement>) {
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
        const paidRenewalOrder = newestBillingOrder(
            data.orders.filter((order) => order.status === 'PAID'),
            'RENEWAL'
        );
        const pendingOrders = data.orders.filter((order) => order.status === 'PENDING');

        return {
            lastOrder,
            activationOrder,
            paidRenewalOrder,
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
            <PageErrorState
                title={tPageError('title')}
                description={tPageError('description')}
                onRetry={billing.refetch}
                actionHref={routes.manage}
                actionLabel={t('backToEvent')}
            />
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
        if (order.kind === 'STORAGE_PACK') return t('orders.storageCoverage');
        return t('orders.recordedCharge');
    };
    const orderStatusClassName = (status: EventBillingResponseDto['orders'][number]['status']) =>
        cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            status === 'PAID' && 'bg-emerald-50 text-emerald-700',
            status === 'PENDING' && 'bg-amber-50 text-amber-700',
            status === 'FAILED' && 'bg-red-50 text-red-700',
            status === 'CANCELLED' && 'bg-surface-muted text-ink-muted'
        );
    const subscriptionCollects =
        subscription?.status === 'ACTIVE' &&
        Boolean(subscription.currentPeriodEnd) &&
        new Date(subscription.currentPeriodEnd ?? '').getTime() > renderedAtMs;
    const paidRenewalCoversNow =
        Boolean(insights.paidRenewalOrder?.coversUntil) && new Date(insights.paidRenewalOrder?.coversUntil ?? '').getTime() > renderedAtMs;
    const subscriptionIsLive = subscription?.status === 'ACTIVE' || subscription?.status === 'PAST_DUE' || paidRenewalCoversNow;
    const subscriptionWillNotRenew = subscription?.cancelAtPeriodEnd ?? false;
    const subscriptionPeriodEnd = subscription?.currentPeriodEnd ?? insights.paidRenewalOrder?.coversUntil ?? coverage.paidThrough;
    const canCancelSubscription = Boolean(subscriptionIsLive && !subscriptionWillNotRenew);
    const hasRenewalPath = data.eventStatus !== 'DRAFT' && data.eventStatus !== 'PURGED' && !coverage.unlimited && !subscriptionCollects;
    const canStartSubscription = hasRenewalPath && !subscriptionIsLive;
    const isRiskState = data.eventStatus === 'FROZEN' || data.eventStatus === 'PURGED' || !coverage.covered;
    const StatusIcon =
        data.eventStatus === 'ACTIVE'
            ? CheckCircle2
            : data.eventStatus === 'DRAFT'
              ? Clock3
              : data.eventStatus === 'FROZEN'
                ? AlertTriangle
                : XCircle;
    const hadSubscription = insights.hadSubscription;
    // A renewal writes an order every month, so a long-running event's history
    // grows without bound. Show a recent window until the host asks for the rest.
    const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);
    const hiddenOrderCount = data.orders.length - visibleOrders.length;
    const addonMonthlyTotal = data.addons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
    const renewalTotal =
        currentPlan?.recurringPriceAmountMinor === null || currentPlan?.recurringPriceAmountMinor === undefined
            ? null
            : discountedAmountMinor(currentPlan.recurringPriceAmountMinor, currentPlan) + addonMonthlyTotal;
    const upgradeButtonLabel = nextPlan ? t('actions.upgradeTo', { plan: nextPlan.name }) : t('actions.renew');
    const upgradeListAmount =
        nextPlan && currentPlan && nextPlan.priceAmountMinor !== null && currentPlan.priceAmountMinor !== null
            ? nextPlan.priceAmountMinor - currentPlan.priceAmountMinor
            : null;
    const upgradeAmount = nextPlan && upgradeListAmount !== null ? discountedAmountMinor(upgradeListAmount, nextPlan) : null;
    const upgradeCurrency = nextPlan?.priceCurrency ?? currentPlan?.priceCurrency ?? insights.orderCurrency;
    const upgradeDueLabel = upgradeAmount !== null ? formatMoney(locale, upgradeAmount, upgradeCurrency) : null;
    const upgradeListDueLabel =
        upgradeListAmount !== null && upgradeAmount !== null && upgradeAmount !== upgradeListAmount
            ? formatMoney(locale, upgradeListAmount, upgradeCurrency)
            : null;
    const upgradeChargeLabel = upgradeDueLabel
        ? coverage.unlimited
            ? t('compare.upgradeChargeUnlimited', { amount: upgradeDueLabel })
            : coverage.paidThrough
              ? t('compare.upgradeCharge', {
                    amount: upgradeDueLabel,
                    date: formatDate(coverage.paidThrough),
                })
              : t('compare.upgradeChargeNoDate', { amount: upgradeDueLabel })
        : null;

    return (
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
            <div className="mb-5">
                <div>
                    <PageBackLink href={routes.manage}>{t('backToEvent')}</PageBackLink>
                    <h1 className="mt-2 text-2xl font-bold text-ink">{t('title')}</h1>
                    <p className="mt-1 text-sm text-ink-muted">{t('subtitle')}</p>
                </div>
            </div>

            <section className={cn('rounded-lg p-4', isRiskState ? 'bg-amber-50/70' : 'bg-surface-muted/45')}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                                    getEventBillingStatusTone(data.eventStatus)
                                )}
                            >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {t(`eventStatus.${data.eventStatus}`)}
                            </span>
                            <span className="text-sm font-semibold text-ink">{data.planTierName}</span>
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
                {data.addons.length > 0 && (
                    <div className="mt-4 rounded-lg bg-background/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('addons.title')}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {data.addons.map((addon, index) => (
                                <span
                                    key={`${addon.code}-${addon.activatedAt}-${index}`}
                                    className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark"
                                >
                                    {t('addons.item', {
                                        name: addon.name,
                                        price: formatMoney(locale, addon.priceAmountMinor, insights.orderCurrency),
                                    })}
                                </span>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-ink-muted">
                            {renewalTotal === null
                                ? t('addons.monthlyTotal', {
                                      amount: formatMoney(locale, addonMonthlyTotal, insights.orderCurrency),
                                  })
                                : t('addons.renewalTotal', {
                                      amount: formatMoney(locale, renewalTotal, currentPlan?.priceCurrency ?? insights.orderCurrency),
                                  })}
                        </p>
                    </div>
                )}
            </section>

            {nextPlan && currentPlan && (
                <section className="mt-6 rounded-lg bg-surface-muted/45 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-ink">{t('compare.upgradeTitle', { plan: nextPlan.name })}</h2>
                            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
                                {t('compare.upgradeSubtitle', { plan: data.planTierName })}
                            </p>
                        </div>
                        <Link
                            href={routes.plans({ eventId, plan: data.planTierCode })}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-background/70 px-3 text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                            {t('compare.allPlansTitle')}
                        </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{currentPlan.name}</span>
                        <span className="text-ink-faint">{t('compare.to')}</span>
                        <span className="font-semibold text-ink">{nextPlan.name}</span>
                        <span className="text-ink-faint">-</span>
                        <span>
                            {upgradeChargeLabel ?? t('compare.upgradeChargeUnavailable')}
                            {upgradeListDueLabel && (
                                <span className="ml-2 text-xs font-semibold text-ink-faint">
                                    <span className="line-through">{upgradeListDueLabel}</span>
                                    {nextPlan.discountLabel && <span className="ml-1">{nextPlan.discountLabel}</span>}
                                </span>
                            )}
                        </span>
                        {upgradeDueLabel && (
                            <Link
                                href={routes.events.checkoutReview(eventId, 'upgrade', nextPlan.code)}
                                className="inline-flex min-h-10 items-center rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink"
                            >
                                {upgradeButtonLabel}
                            </Link>
                        )}
                    </div>
                </section>
            )}

            {data.eventStatus === 'ACTIVE' && paidAddonOffers.length > 0 && (
                <section className="mt-6 flex flex-col gap-3 rounded-lg bg-surface-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <PackagePlus className="mt-0.5 h-5 w-5 text-primary-dark" aria-hidden="true" />
                        <div>
                            <h2 className="text-sm font-bold text-ink">{t('addons.manageTitle')}</h2>
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('addons.manageBody')}</p>
                        </div>
                    </div>
                    <Link
                        href={routes.events.settingsAddons(eventId)}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-background/80 px-4 text-xs font-semibold text-ink"
                    >
                        {t('addons.manageAction')}
                    </Link>
                </section>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                <section className="min-w-0 space-y-4">
                    <section className="space-y-3">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-ink">{t('timeline.title')}</h2>
                            {coverage.unlimited && <span className="text-xs font-semibold text-emerald-700">{t('timeline.unlimited')}</span>}
                        </div>
                        <div className="space-y-3 rounded-lg bg-surface-muted/45 p-3">
                            {[
                                { key: 'paidThrough', value: coverage.paidThrough },
                                { key: 'freezesAt', value: coverage.freezesAt },
                                { key: 'purgesAt', value: coverage.purgesAt },
                            ].map((item) => (
                                <div key={item.key} className="text-sm">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink">{t(`timeline.${item.key}.label`)}</p>
                                            <p className="mt-0.5 text-xs leading-5 text-ink-muted">{t(`timeline.${item.key}.hint`)}</p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-ink">
                                            {coverage.unlimited ? t('notApplicable') : formatDate(item.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-bold text-ink">{t('orders.title')}</h2>
                            {insights.lastOrder && (
                                <p className="text-xs text-ink-muted">{t('orders.lastOrder', { date: formatDate(insights.lastOrder.createdAt) })}</p>
                            )}
                        </div>
                        <div className="md:hidden">
                            {data.orders.length === 0 ? (
                                <p className="rounded-md bg-surface-muted/60 p-3 text-sm text-ink-muted">{t('orders.empty')}</p>
                            ) : (
                                <div className="space-y-3 rounded-lg bg-surface-muted/45 p-3">
                                    {visibleOrders.map((order) => (
                                        <article key={order.id} className="text-sm" title={order.id}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                                        <span className={orderStatusClassName(order.status)}>{t(`orderStatus.${order.status}`)}</span>
                                                    </div>
                                                    <p className="text-xs text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</p>
                                                </div>
                                                <p className="shrink-0 text-right font-semibold text-ink">
                                                    {formatMoney(locale, order.amountMinor, order.currency)}
                                                    {order.addonAmountMinor !== null && (
                                                        <span className="block text-[10px] font-normal text-ink-muted">
                                                            {t('orders.addonAmount', {
                                                                amount: formatMoney(locale, order.addonAmountMinor, order.currency),
                                                            })}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{orderCoverageLabel(order)}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="hidden overflow-hidden rounded-lg bg-surface-muted/45 md:block">
                            <table className="w-full table-fixed text-left text-sm">
                                <thead className="bg-surface-muted text-[11px] uppercase tracking-wide text-ink-faint">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">{t('orders.columns.kind')}</th>
                                        <th className="px-3 py-2 font-semibold md:w-28">{t('orders.columns.status')}</th>
                                        <th className="px-3 py-2 font-semibold md:w-36">{t('orders.columns.date')}</th>
                                        <th className="px-3 py-2 text-right font-semibold md:w-32">{t('orders.columns.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-6 text-sm text-ink-muted">
                                                {t('orders.empty')}
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleOrders.map((order) => (
                                            <tr key={order.id} className="align-top odd:bg-card/40" title={order.id}>
                                                <td className="px-3 py-2.5">
                                                    <p className="font-medium text-ink">{t(`orders.kind.${order.kind}`)}</p>
                                                    <p className="mt-0.5 truncate text-xs text-ink-muted">{orderCoverageLabel(order)}</p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className={orderStatusClassName(order.status)}>{t(`orderStatus.${order.status}`)}</span>
                                                </td>
                                                <td className="px-3 py-2.5 text-ink-muted">{formatDate(order.paidAt ?? order.createdAt)}</td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-ink">
                                                    {formatMoney(locale, order.amountMinor, order.currency)}
                                                    {order.addonAmountMinor !== null && (
                                                        <span className="block text-[10px] font-normal text-ink-muted">
                                                            {t('orders.addonAmount', {
                                                                amount: formatMoney(locale, order.addonAmountMinor, order.currency),
                                                            })}
                                                        </span>
                                                    )}
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
                    </section>
                </section>

                <aside className="space-y-6 lg:min-w-0">
                    <section className="space-y-3">
                        <dl className="space-y-3 rounded-lg bg-surface-muted/45 p-3 text-sm">
                            <div>
                                <dt className="text-xs font-semibold text-ink">{t('subscription.title')}</dt>
                                <dd className="mt-1 flex justify-between gap-4">
                                    <span className="text-ink-muted">{t('subscription.status')}</span>
                                    <span className="text-right font-semibold text-ink">
                                        {subscriptionIsLive
                                            ? subscriptionWillNotRenew
                                                ? t('subscription.notRenewing')
                                                : subscription?.status === 'PAST_DUE'
                                                  ? t('subscriptionStatus.PAST_DUE')
                                                  : t('subscriptionStatus.ACTIVE')
                                            : subscription
                                              ? t(`subscriptionStatus.${subscription.status}`)
                                              : hadSubscription
                                                ? t('subscription.ended')
                                                : t('subscription.none')}
                                    </span>
                                </dd>
                                {subscriptionPeriodEnd && subscriptionIsLive && (
                                    <dd className="mt-1 flex justify-between gap-4 text-xs">
                                        <span className="text-ink-muted">
                                            {subscriptionWillNotRenew ? t('subscription.liveUntil') : t('subscription.currentPeriodEnd')}
                                        </span>
                                        <span className="text-right font-medium text-ink">{formatDate(subscriptionPeriodEnd)}</span>
                                    </dd>
                                )}
                            </div>
                            <div>
                                <dt className="text-xs font-semibold text-ink">{t('activation.title')}</dt>
                                <dd className="mt-1 flex justify-between gap-4">
                                    <span className="text-ink-muted">{t('activation.amount')}</span>
                                    <span className="text-right font-semibold text-ink">
                                        {insights.activationOrder
                                            ? formatMoney(locale, insights.activationOrder.amountMinor, insights.activationOrder.currency)
                                            : t('emptyDate')}
                                    </span>
                                </dd>
                                <dd className="mt-1 flex justify-between gap-4 text-xs">
                                    <span className="text-ink-muted">{t('activation.paidAt')}</span>
                                    <span className="text-right font-medium text-ink">{formatDate(insights.activationOrder?.paidAt ?? null)}</span>
                                </dd>
                            </div>
                        </dl>

                        {/* ACTIVE alone no longer means "renewing" - split the copy on the
                            flag, or a cancelled subscription reads as healthy. */}
                        {subscriptionIsLive && (
                            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                                {subscriptionWillNotRenew
                                    ? t('subscription.willNotRenew', { date: formatDate(subscriptionPeriodEnd) })
                                    : subscription?.status === 'PAST_DUE'
                                      ? t('subscription.pastDue')
                                      : t('subscription.renewsOn', { date: formatDate(subscriptionPeriodEnd) })}
                            </p>
                        )}

                        {canCancelSubscription && (
                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={askCancelConfirmation}
                                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-surface-muted/70 px-3 py-2 text-xs font-semibold text-ink sm:w-auto"
                                >
                                    {t('subscription.cancel')}
                                </button>
                            </div>
                        )}

                        {subscriptionWillNotRenew && <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t('subscription.noResume')}</p>}
                        {canStartSubscription && (
                            <div className="mt-2 space-y-3">
                                <p className="text-xs leading-relaxed text-ink-muted">{t('subscription.renewalHint')}</p>
                                <Link
                                    href={routes.events.checkoutReview(eventId, 'renewal')}
                                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-white sm:w-auto"
                                >
                                    {t('actions.reviewRenewal')}
                                </Link>
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-bold text-ink">{t('refund.title')}</h2>
                        <div className="rounded-lg bg-surface-muted/45 p-3 text-sm">
                            {refundEligibility.isLoading || refundHistory.isLoading ? (
                                <p className="text-ink-muted">{t('refund.loading')}</p>
                            ) : refundRequest ? (
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-ink">
                                            {refundRequest.amountMinor !== null && refundRequest.currency
                                                ? formatMoney(locale, refundRequest.amountMinor, refundRequest.currency)
                                                : t('refund.requestedNoAmount')}
                                        </p>
                                        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                            {t(`refundStatus.${refundRequest.status}`)}
                                        </span>
                                    </div>
                                    {refundRequest.decisionNote && (
                                        <p className="text-xs leading-relaxed text-ink-muted">{refundRequest.decisionNote}</p>
                                    )}
                                    {/* Approved but no money moved yet: say so rather than let the
                                        host assume the payment is already back. */}
                                    {refundRequest.status === 'APPROVED' && !refundRequest.providerRefunded && (
                                        <p className="text-xs leading-relaxed text-amber-700">{t('refund.notRefundedYet')}</p>
                                    )}
                                </div>
                            ) : refundEligibility.data?.hasPendingRequest ? (
                                <p className="text-ink-muted">{t('refund.pending')}</p>
                            ) : refundEligibility.data?.eligible ? (
                                <form onSubmit={askRefundConfirmation} className="space-y-3">
                                    <p className="text-ink-muted">{t('refund.eligible')}</p>
                                    <label className="block">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                                            {t('refund.reason')} <span className="text-ink-faint/80">({tCommon('optional')})</span>
                                        </span>
                                        <textarea
                                            value={refundReason}
                                            onChange={handleRefundReasonChange}
                                            rows={2}
                                            className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/15"
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
                                            disabled={requestRefund.isPending}
                                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-background px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
            <ConfirmActionModal
                open={confirmingCancel}
                title={t('subscription.cancelConfirmTitle')}
                body={
                    <div className="space-y-2">
                        <p>{t('subscription.cancelConfirmBody', { date: formatDate(subscriptionPeriodEnd) })}</p>
                        {cancelError && <p className="text-xs text-rose-600">{cancelError}</p>}
                    </div>
                }
                confirmLabel={t('subscription.cancelConfirmYes')}
                cancelLabel={t('subscription.cancelConfirmNo')}
                onClose={dismissCancelConfirmation}
                onConfirm={confirmCancelSubscription}
                isConfirming={cancelSubscription.isPending}
            />
        </main>
    );
}
