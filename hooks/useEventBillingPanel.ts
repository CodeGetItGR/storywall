'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useUpgradeOptions } from '@/hooks/useBilling';
import { useEventUsage } from '@/hooks/useUsage';
import { billingCurrency, formatBillingDate, newestBillingOrder, paidBillingTotal } from '@/lib/billing';
import { scopedPlans } from '@/lib/planTiers';

const ORDER_PREVIEW_COUNT = 6;

/**
 * Every derived fact, mutation and dialog flag the billing section renders.
 * The panels under components/manage/billing stay declarative shells over this.
 */
export function useEventBillingPanel(eventId: string, { isDeleted = false }: { isDeleted?: boolean } = {}) {
    const appConfigQuery = useAppConfig();
    const billing = useEventBilling(eventId, true);

    const [showAllOrders, setShowAllOrders] = useState(false);

    const data = billing.data;
    const eventPlans = useMemo(() => scopedPlans(appConfigQuery.data?.planTiers ?? [], 'EVENT'), [appConfigQuery.data?.planTiers]);
    const currentPlan = useMemo(() => eventPlans.find((plan) => plan.code === data?.planTierCode) ?? null, [data?.planTierCode, eventPlans]);
    // upgrade-options 404s on purpose for a deleted event, and nothing can be
    // bought for it — keep billing (the refund shows there) and drop the rest.
    // Usage is skipped too: a deleted event has no limits left to show.
    const upgradeOptions = useUpgradeOptions(eventId, !isDeleted);
    const usageQuery = useEventUsage(isDeleted ? null : eventId);
    // Every target the server offers, not just the next tier: a host can jump
    // straight to the top plan and pay the difference once. The server option
    // stays the source of truth even when the catalog can't resolve its plan.
    const upgradeTargets = useMemo(
        () =>
            (upgradeOptions.data ?? []).map((option) => ({
                option,
                plan: eventPlans.find((plan) => plan.code === option.planTierCode) ?? null,
            })),
        [eventPlans, upgradeOptions.data],
    );
    const paidAddonOffers = useMemo(
        () =>
            isDeleted
                ? []
                : (appConfigQuery.data?.paidServices ?? []).filter(
                      (service) => service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false),
                  ),
        [appConfigQuery.data?.paidServices, currentPlan, isDeleted],
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
        void appConfigQuery.refetch();
        void billing.refetch();
        void upgradeOptions.refetch();
        void usageQuery.refetch();
    }, [appConfigQuery, billing, upgradeOptions, usageQuery]);

    const derived = useMemo(() => {
        if (!data || !insights) return null;

        // A renewal writes an order every month, so a long-running event's history
        // grows without bound. Show a recent window until the host asks for the rest.
        const visibleOrders = showAllOrders ? data.orders : data.orders.slice(0, ORDER_PREVIEW_COUNT);

        return {
            canManageAddons: data.eventStatus === 'ACTIVE' && paidAddonOffers.length > 0,
            visibleOrders,
            hiddenOrderCount: data.orders.length - visibleOrders.length,
        };
    }, [data, insights, paidAddonOffers.length, showAllOrders]);

    return {
        data,
        insights,
        derived,
        currentPlan,
        upgradeTargets,
        // A usage failure only hides the limit facts; it never blocks billing.
        usage: usageQuery.data ?? null,
        platformModules: appConfigQuery.data?.modules ?? [],
        paidAddonOffers,
        isLoading: appConfigQuery.isLoading || billing.isLoading || upgradeOptions.isLoading || usageQuery.isLoading,
        hasError: Boolean(appConfigQuery.error || billing.error || upgradeOptions.error) || !data || !insights || !derived,
        handleRetry,
        // Orders
        handleShowAllOrders,
    };
}

export type EventBillingPanel = ReturnType<typeof useEventBillingPanel>;

export type BillingData = NonNullable<EventBillingPanel['data']>;
export type BillingInsights = NonNullable<EventBillingPanel['insights']>;
export type BillingDerived = NonNullable<EventBillingPanel['derived']>;
export type BillingUpgradeTarget = EventBillingPanel['upgradeTargets'][number];

/** Billing dates render as a localised date, or the section's "not set" dash. */
export function useBillingDate() {
    const locale = useLocale();
    const t = useTranslations('EventPlanSettingsPage');
    return useCallback((value: string | null) => formatBillingDate(locale, value) ?? t('emptyDate'), [locale, t]);
}
