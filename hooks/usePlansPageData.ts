import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage, useRetryAfterCountdown } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useUpgradeCheckout } from '@/hooks/useBilling';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { navigateToCheckout } from '@/lib/billing';
import { publicAssignablePlans } from '@/lib/planTiers';

export function usePlansPageData() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('eventId');
    const selectedPlanCode = searchParams.get('plan');
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId);
    const upgradeCheckout = useUpgradeCheckout(eventId ?? '');
    const retryIn = useRetryAfterCountdown(upgradeCheckout.error);
    const toErrorMessage = useApiErrorMessage();
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [pendingPlanCode, setPendingPlanCode] = useState<string | null>(null);
    const plans = useMemo(() => publicAssignablePlans(appConfig.data?.planTiers ?? [], 'EVENT'), [appConfig.data?.planTiers]);
    const eventPlanCode = billing.data?.planTierCode ?? null;
    const currentPlanCode = eventPlanCode ?? selectedPlanCode;
    const selectedPlan = currentPlanCode ? (plans.find((plan) => plan.code === currentPlanCode) ?? null) : null;
    const selectedIndex = selectedPlan ? plans.findIndex((plan) => plan.id === selectedPlan.id) : -1;
    const nextPlan = selectedIndex >= 0 ? (plans[selectedIndex + 1] ?? null) : null;
    const upgradeTargets = useMemo(() => {
        if (!eventId || !selectedPlan || selectedPlan.priceAmountMinor === null || !selectedPlan.priceCurrency) return [];

        const currentPrice = selectedPlan.priceAmountMinor;
        const currentCurrency = selectedPlan.priceCurrency;

        return plans.filter(
            (plan) =>
                plan.code !== selectedPlan.code &&
                plan.priceAmountMinor !== null &&
                Boolean(plan.priceCurrency) &&
                plan.priceCurrency === currentCurrency &&
                plan.priceAmountMinor > currentPrice
        );
    }, [eventId, plans, selectedPlan]);

    const startUpgrade = useCallback(
        async (targetPlan: string) => {
            if (!eventId) return;

            setCheckoutError(null);
            setPendingPlanCode(targetPlan);

            try {
                await appConfig.refetch();
            } catch {
                // Fresh config improves the picker, but checkout still validates the target.
            }

            try {
                const checkout = await upgradeCheckout.mutateAsync({ planTierCode: targetPlan });
                navigateToCheckout(eventId, checkout, targetPlan);
            } catch (error) {
                const code = getErrorCode(error);
                if (code === ERROR_CODES.PLAN_TIER_NOT_AN_UPGRADE || code === ERROR_CODES.PLAN_TIER_NOT_PURCHASABLE) {
                    await appConfig.refetch();
                }
                setCheckoutError(toErrorMessage(error));
                setPendingPlanCode(null);
            }
        },
        [appConfig, eventId, toErrorMessage, upgradeCheckout]
    );

    return {
        checkoutError,
        currentBilling: billing.data ?? null,
        eventId,
        hasError: Boolean(appConfig.error || (eventId && billing.error)),
        isCheckoutPending: upgradeCheckout.isPending,
        isLoading: appConfig.isLoading || Boolean(eventId && billing.isLoading),
        modules: appConfig.data?.modules ?? [],
        nextPlan,
        pendingPlanCode,
        plans,
        retry: () => {
            void appConfig.refetch();
            if (eventId) void billing.refetch();
        },
        retryIn,
        selectedPlan,
        selectedPlanCode: currentPlanCode,
        startUpgrade,
        upgradeTargets,
    };
}
