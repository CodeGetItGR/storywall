'use client';

import { useDisclosure } from '@/hooks/useDisclosure';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { isLitePlan } from '@/lib/planTiers';

// Whether the lite plans row is open. It starts open when the selected plan is a lite one, so a link that
// opens creation on it shows the choice. Reads the selection on first render only.
export function useLitePlansOpen(plans: PlanTierResponseDto[], selectedCode: string) {
    const selected = plans.find((plan) => plan.code === selectedCode);
    return useDisclosure(selected ? isLitePlan(selected) : false);
}
