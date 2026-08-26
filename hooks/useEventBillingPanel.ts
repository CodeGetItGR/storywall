'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useEventRefundRequests, useRefundEligibility, useRequestRefund } from '@/hooks/useBilling';
import { billingCurrency, discountedAmountMinor, formatBillingDate, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { publicAssignablePlans, scopedPlans } from '@/lib/planTiers';

const ORDER_PREVIEW_COUNT = 6;

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
    const toErrorMessage = useApiErrorMessage();
    const refundRetryIn = useRetryAfterCountdown(requestRefund.error);

    const [refundReason, setRefundReason] = useState('');
    const [refundError, setRefundError] = useState<string | null>(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);
    const [showAllOrders, setShowAllOrders] = useState(false);

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

        return {
            lastOrder: newestBillingOrder(data.orders),
            activationOrder: newestBillingOrder(data.orders, 'ACTIVATION'),
            paidTotalMinor: paidBillingTotal(data.orders),
            orderCurrency: billingCurrency(data.orders),
        };
    }, [data]);

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

        const addonTotal = data.addons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
        const upgradeListAmount =
            nextPlan && currentPlan && nextPlan.priceAmountMinor !== null && currentPlan.priceAmountMinor !== null
                ? nextPlan.priceAmountMinor - currentPlan.priceAmountMinor
                : null;

        // A renewal writes an order every month, so a long-running event's history
        // grows without bound. Show a recent window until the host asks for the rest.
        const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);

        return {
            addonTotal,
            isRiskState: data.eventStatus === 'DRAFT',
            upgradeListAmount,
            upgradeAmount: nextPlan && upgradeListAmount !== null ? discountedAmountMinor(upgradeListAmount, nextPlan) : null,
            upgradeCurrency: nextPlan?.priceCurrency ?? currentPlan?.priceCurrency ?? insights.orderCurrency,
            visibleOrders,
            hiddenOrderCount: data.orders.length - visibleOrders.length,
        };
    }, [currentPlan, data, insights, nextPlan, showAllOrders]);

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
