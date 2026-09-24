'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { liveInitialOptions, shortestInitialOption } from '@/lib/planTiers';

// The duration an admin tool puts an event on. An empty id sends no
// coverageOptionId and lets the server choose. The pick belongs to one plan,
// so switching plans falls back to the default without an explicit reset.
export function useAdminDurationPick(plan: PlanTierResponseDto | null, { preselectShortest = false }: { preselectShortest?: boolean } = {}) {
    const [pick, setPick] = useState<{ planId: string; optionId: string } | null>(null);
    const options = plan ? liveInitialOptions(plan) : [];
    const fallbackId = preselectShortest && plan ? (shortestInitialOption(plan)?.id ?? '') : '';
    const pickIsCurrent = Boolean(
        plan && pick?.planId === plan.id && (pick.optionId === '' || options.some((option) => option.id === pick.optionId)),
    );
    const optionId = pickIsCurrent && pick ? pick.optionId : fallbackId;

    function handleChange(event: ChangeEvent<HTMLSelectElement>) {
        if (plan) setPick({ planId: plan.id, optionId: event.target.value });
    }

    return {
        options,
        optionId,
        selectedOption: options.find((option) => option.id === optionId) ?? null,
        handleChange,
    };
}

export type AdminDurationPick = ReturnType<typeof useAdminDurationPick>;
