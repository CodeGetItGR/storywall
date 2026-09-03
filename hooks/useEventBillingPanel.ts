'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useUpgradeOptions } from '@/hooks/useBilling';
import { useEventRefundFlow } from '@/hooks/useEventRefundFlow';
import { billingCurrency, formatBillingDate, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { publicAssignablePlans, scopedPlans } from '@/lib/planTiers';

const ORDER_PREVIEW_COUNT = 6;

/**
 * Every derived fact, mutation and dialog flag the billing section renders.
 * The panels under components/manage/billing stay declarative shells over this.
 */
export function useEventBillingPanel(eventId: string) {
    const appConfigQuery = useAppConfig();
    const billing = useEventBilling(eventId, true);
    const refundFlow = useEventRefundFlow(eventId);

    const [showAllOrders, setShowAllOrders] = useState(false);

    const data = billing.data;
    const planTiers = useMemo(() => appConfigQuery.data?.planTiers ?? [], [appConfigQuery.data?.planTiers]);
    const eventPlans = useMemo(() => publicAssignablePlans(planTiers, 'EVENT'), [planTiers]);
    const currentPlan = useMemo(
        () => scopedPlans(planTiers, 'EVENT').find((plan) => plan.code === data?.planTierCode) ?? null,
        [data?.planTierCode, planTiers]
    );
    const upgradeOptions = useUpgradeOptions(eventId);
    const firstUpgradeOption = upgradeOptions.data?.[0] ?? null;
    const nextPlan = useMemo(
        () => (firstUpgradeOption ? (eventPlans.find((plan) => plan.code === firstUpgradeOption.planTierCode) ?? null) : null),
        [eventPlans, firstUpgradeOption]
    );
    const paidAddonOffers = useMemo(
        () =>
            (appConfigQuery.data?.paidServices ?? []).filter(
                (service) => service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false)
            ),
        [appConfigQuery.data?.paidServices, currentPlan]
    );
    const insights = useMemo(() => {
        if (!data) return null;

        return {
            lastOrder: newestBillingOrder(data.orders),
            activationOrder: newestBillingOrder(data.orders, 'ACTIVATION'),
            paidTotalMinor: paidBillingTotal(data.orders),
            orderCurrency: billingCurrency(data.orders),
        };
    }, [data]);

    const handleShowAllOrders = useCallback(() => setShowAllOrders(true), []);
    const handleRetry = useCallback(() => {
        void billing.refetch();
        void upgradeOptions.refetch();
    }, [billing, upgradeOptions]);

    const derived = useMemo(() => {
        if (!data || !insights) return null;

        const addonTotal = data.addons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);

        // A renewal writes an order every month, so a long-running event's history
        // grows without bound. Show a recent window until the host asks for the rest.
        const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);

        return {
            addonTotal,
            isRiskState: data.eventStatus === 'DRAFT',
            upgradeListAmount: firstUpgradeOption?.gapAmountMinor ?? null,
            upgradeAmount: firstUpgradeOption?.payableAmountMinor ?? null,
            upgradeCurrency: firstUpgradeOption?.currency ?? currentPlan?.priceCurrency ?? insights.orderCurrency,
            upgradeDiscountLabel: firstUpgradeOption?.discountLabel ?? null,
            visibleOrders,
            hiddenOrderCount: data.orders.length - visibleOrders.length,
        };
    }, [currentPlan, data, firstUpgradeOption, insights, showAllOrders]);

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
        ...refundFlow,
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
