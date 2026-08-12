import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { publicAssignablePlans } from '@/lib/planTiers';

export function usePlansPageData() {
    const t = useTranslations('EventPlanSettingsPage');
    const searchParams = useSearchParams();
    const selectedPlanCode = searchParams.get('plan');
    const appConfig = useAppConfig();
    const plans = publicAssignablePlans(appConfig.data?.planTiers ?? [], 'EVENT');
    const selectedPlan = selectedPlanCode ? (plans.find((plan) => plan.code === selectedPlanCode) ?? null) : null;
    const selectedIndex = selectedPlan ? plans.findIndex((plan) => plan.id === selectedPlan.id) : -1;
    const nextPlan = selectedIndex >= 0 ? (plans[selectedIndex + 1] ?? null) : null;

    return {
        errorMessage: t('loadError'),
        hasError: Boolean(appConfig.error),
        isLoading: appConfig.isLoading,
        modules: appConfig.data?.modules ?? [],
        nextPlan,
        plans,
        selectedPlan,
        selectedPlanCode,
    };
}
