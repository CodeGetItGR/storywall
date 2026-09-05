'use client';

import { PlansContent } from '@/components/plan/PlansContent';
import { PlansErrorState } from '@/components/plan/PlansErrorState';
import { PlansLoadingState } from '@/components/plan/PlansLoadingState';
import { usePlansPageData } from '@/hooks/usePlansPageData';

export default function PlansPage() {
    const data = usePlansPageData();

    if (data.isLoading) {
        return <PlansLoadingState />;
    }

    if (data.hasError) {
        return <PlansErrorState onRetryAction={data.retry} />;
    }

    return (
        <PlansContent
            checkoutError={data.checkoutError}
            isCheckoutPending={data.isCheckoutPending}
            modules={data.modules}
            paidServices={data.paidServices}
            nextPlan={data.nextPlan}
            onUpgrade={data.startUpgrade}
            pendingPlanCode={data.pendingPlanCode}
            plans={data.plans}
            retryIn={data.retryIn}
            selectedPlan={data.selectedPlan}
            selectedPlanCode={data.selectedPlanCode}
            upgradeOptions={data.upgradeOptions}
        />
    );
}
