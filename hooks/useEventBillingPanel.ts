'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCancelSubscription, useEventBilling, useEventRefundRequests, useRefundEligibility, useRequestRefund } from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { billingCurrency, discountedAmountMinor, formatBillingDate, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { publicAssignablePlans, scopedPlans } from '@/lib/planTiers';

const ORDER_PREVIEW_COUNT = 6;
// A host can renew from this many days before coverage runs out - matches the
// dunning window, so the CTA never shows up while the included period still
// has months left to run.
const RENEWAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Every derived fact, mutation and dialog flag the billing section renders.
 * The panels under components/manage/billing stay declarative shells over this.
 */
export function useEventBillingPanel(eventId: string) {
    const appConfigQuery = useAppConfig();
    const billing = useEventBilling(eventId, true);
    const refundEligibility = useRefundEligibility(eventId);
    const requestRefund = useRequestRefund(eventId);
    const refundHistory = useEventRefundRequests(eventId);
    const cancelSubscription = useCancelSubscription(eventId);
    const toErrorMessage = useApiErrorMessage();
    const refundRetryIn = useRetryAfterCountdown(requestRefund.error);

    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [showAllOrders, setShowAllOrders] = useState(false);
    const [renderedAtMs] = useState(() => Date.now());

    const data = billing.data;
    const planTiers = useMemo(() => appConfigQuery.data?.planTiers ?? [], [appConfigQuery.data?.planTiers]);
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
    const nextPlan = upgradeTargets[0] ?? null;
    const paidAddonOffers = useMemo(
        () =>
            (appConfigQuery.data?.paidServices ?? []).filter(
                (service) => service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false)
            ),
        [appConfigQuery.data?.paidServices, currentPlan]
    );
    // Server-side history, so a decision (and its note) survives a reload - the
    // page used to only know about a request the same tab had just submitted.
    const refundRequest = refundHistory.data?.[0] ?? null;

    const insights = useMemo(() => {
        if (!data) return null;
        const paidRenewalOrder = newestBillingOrder(
            data.orders.filter((order) => order.status === 'PAID'),
            'RENEWAL'
        );

        return {
            lastOrder: newestBillingOrder(data.orders),
            activationOrder: newestBillingOrder(data.orders, 'ACTIVATION'),
            paidRenewalOrder,
            paidTotalMinor: paidBillingTotal(data.orders),
            orderCurrency: billingCurrency(data.orders),
            // `subscription: null` means "never subscribed" OR "subscribed, then it
            // ended at the period boundary". A renewal order is the only evidence
            // on this payload that distinguishes the two.
            hadSubscription: data.orders.some((order) => order.kind === 'RENEWAL'),
        };
    }, [data]);

    const askCancelConfirmation = useCallback(() => {
        setCancelError(null);
        setConfirmingCancel(true);
    }, []);
    const dismissCancelConfirmation = useCallback(() => setConfirmingCancel(false), []);
    const cancelRefundConfirmation = useCallback(() => setConfirmingRefund(false), []);
    const handleShowAllOrders = useCallback(() => setShowAllOrders(true), []);
    const handleRetry = useCallback(() => {
        void billing.refetch();
    }, [billing]);

    const handleRefundReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        setRefundReason(event.target.value);
    }, []);

    const askRefundConfirmation = useCallback((event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setRefundError(null);
        setConfirmingRefund(true);
    }, []);

    const confirmCancelSubscription = useCallback(async () => {
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
    }, [billing, cancelSubscription, toErrorMessage]);

    const submitRefundRequest = useCallback(async () => {
        setRefundError(null);
        try {
            await requestRefund.mutateAsync(refundReason.trim());
            setRefundReason('');
            setConfirmingRefund(false);
        } catch (e) {
            setRefundError(toErrorMessage(e));
            setConfirmingRefund(false);
        }
    }, [refundReason, requestRefund, toErrorMessage]);

    const derived = useMemo(() => {
        if (!data || !insights) return null;

        const coverage = data.coverage;
        const subscription = data.subscription;
        const subscriptionCollects =
            subscription?.status === 'ACTIVE' &&
            Boolean(subscription.currentPeriodEnd) &&
            new Date(subscription.currentPeriodEnd ?? '').getTime() > renderedAtMs;
        const paidRenewalCoversNow =
            Boolean(insights.paidRenewalOrder?.coversUntil) && new Date(insights.paidRenewalOrder?.coversUntil ?? '').getTime() > renderedAtMs;
        const subscriptionIsLive = subscription?.status === 'ACTIVE' || subscription?.status === 'PAST_DUE' || paidRenewalCoversNow;
        const subscriptionWillNotRenew = subscription?.cancelAtPeriodEnd ?? false;
        const hasRenewalPath = data.eventStatus !== 'DRAFT' && data.eventStatus !== 'PURGED' && !coverage.unlimited && !subscriptionCollects;
        // Coverage still has months left on the included period - nothing to renew yet, so
        // don't offer the CTA even though there is technically no subscription running.
        const subscriptionDueSoon = !coverage.paidThrough || new Date(coverage.paidThrough).getTime() - renderedAtMs <= RENEWAL_WINDOW_MS;

        // A ONE_TIME add-on (a module unlock bought outright) was paid for at activation
        // and never appears on a renewal, so it must not feed this total.
        const addonMonthlyTotal = data.addons
            .filter((addon) => addon.billingPeriod === 'MONTHLY')
            .reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
        const upgradeListAmount =
            nextPlan && currentPlan && nextPlan.priceAmountMinor !== null && currentPlan.priceAmountMinor !== null
                ? nextPlan.priceAmountMinor - currentPlan.priceAmountMinor
                : null;

        // A renewal writes an order every month, so a long-running event's history
        // grows without bound. Show a recent window until the host asks for the rest.
        const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);

        return {
            coverage,
            subscription,
            subscriptionIsLive,
            subscriptionWillNotRenew,
            subscriptionPeriodEnd: subscription?.currentPeriodEnd ?? insights.paidRenewalOrder?.coversUntil ?? coverage.paidThrough,
            canCancelSubscription: Boolean(subscriptionIsLive && !subscriptionWillNotRenew),
            canStartSubscription: hasRenewalPath && !subscriptionIsLive && subscriptionDueSoon,
            isRiskState: data.eventStatus === 'FROZEN' || data.eventStatus === 'PURGED' || !coverage.covered,
            addonMonthlyTotal,
            renewalTotal:
                currentPlan?.recurringPriceAmountMinor === null || currentPlan?.recurringPriceAmountMinor === undefined
                    ? null
                    : discountedAmountMinor(currentPlan.recurringPriceAmountMinor, currentPlan) + addonMonthlyTotal,
            upgradeListAmount,
            upgradeAmount: nextPlan && upgradeListAmount !== null ? discountedAmountMinor(upgradeListAmount, nextPlan) : null,
            upgradeCurrency: nextPlan?.priceCurrency ?? currentPlan?.priceCurrency ?? insights.orderCurrency,
            visibleOrders,
            hiddenOrderCount: data.orders.length - visibleOrders.length,
        };
    }, [currentPlan, data, insights, nextPlan, renderedAtMs, showAllOrders]);

    return {
        data,
        insights,
        derived,
        currentPlan,
        nextPlan,
        paidAddonOffers,
        isLoading: billing.isLoading,
        hasError: Boolean(billing.error) || !data || !insights || !derived,
        handleRetry,
        // Orders
        handleShowAllOrders,
        // Subscription cancellation
        cancelError,
        confirmingCancel,
        isCancelling: cancelSubscription.isPending,
        askCancelConfirmation,
        dismissCancelConfirmation,
        confirmCancelSubscription,
        // Refunds
        refundEligibility,
        refundHistory,
        refundRequest,
        refundReason,
        refundError,
        refundRetryIn,
        confirmingRefund,
        isRequestingRefund: requestRefund.isPending,
        handleRefundReasonChange,
        askRefundConfirmation,
        submitRefundRequest,
        cancelRefundConfirmation,
    };
}

export type EventBillingPanel = ReturnType<typeof useEventBillingPanel>;

export type BillingData = NonNullable<EventBillingPanel['data']>;
export type BillingInsights = NonNullable<EventBillingPanel['insights']>;
export type BillingDerived = NonNullable<EventBillingPanel['derived']>;

/** Billing dates render as a localised date, or the section's "not set" dash. */
export function useBillingDate() {
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    return useCallback((value: string | null) => formatBillingDate(locale, value) ?? t('emptyDate'), [locale, t]);
}
