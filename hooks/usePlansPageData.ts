import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling, useUpgradeOptions } from '@/hooks/useBilling';
import { publicAssignablePlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export function usePlansPageData() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const eventId = searchParams.get('eventId');
    const selectedPlanCode = searchParams.get('plan');
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId);
    const upgradeOptions = useUpgradeOptions(eventId);
    const plans = useMemo(() => publicAssignablePlans(appConfig.data?.planTiers ?? [], 'EVENT'), [appConfig.data?.planTiers]);
    const eventPlanCode = billing.data?.planTierCode ?? null;
    const currentPlanCode = eventPlanCode ?? selectedPlanCode;
    const selectedPlan = currentPlanCode ? (plans.find((plan) => plan.code === currentPlanCode) ?? null) : null;
    const selectedIndex = selectedPlan ? plans.findIndex((plan) => plan.id === selectedPlan.id) : -1;
    const nextPlan = selectedIndex >= 0 ? (plans[selectedIndex + 1] ?? null) : null;

    const startUpgrade = useCallback(
        (targetPlan: string) => {
            if (!eventId) return;
            router.push(routes.events.checkoutReview(eventId, 'upgrade', targetPlan));
        },
        [eventId, router]
    );

    return {
        checkoutError: null,
        currentBilling: billing.data ?? null,
        hasError: Boolean(appConfig.error || (eventId && billing.error)),
        isCheckoutPending: false,
        isLoading: appConfig.isLoading || Boolean(eventId && billing.isLoading) || Boolean(eventId && upgradeOptions.isLoading),
        modules: appConfig.data?.modules ?? [],
        paidServices: appConfig.data?.paidServices ?? [],
        nextPlan,
        pendingPlanCode: null,
        plans,
        retry: () => {
            void appConfig.refetch();
            if (eventId) {
                void billing.refetch();
                void upgradeOptions.refetch();
            }
        },
        retryIn: 0,
        selectedPlan,
        selectedPlanCode: currentPlanCode,
        startUpgrade,
        upgradeOptions: upgradeOptions.data ?? [],
    };
}
