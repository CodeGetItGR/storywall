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
        return <PlansErrorState message={data.errorMessage} />;
    }

    return (
        <PlansContent
            modules={data.modules}
            nextPlan={data.nextPlan}
            plans={data.plans}
            selectedPlan={data.selectedPlan}
            selectedPlanCode={data.selectedPlanCode}
        />
    );
}
