'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { billingKeys } from '@/hooks/useBilling';
import { useUpdateEvent } from '@/hooks/useEvent';
import type { CoverageOptionResponseDto, EventBillingResponseDto } from '@/lib/api/types';
import { coverageFitsStart } from '@/lib/eventCoverage';

/**
 * The duration a DRAFT event will be activated with. Checkout charges the
 * draft's saved duration, so a pick is saved straight away. A duration too short
 * to cover the start from today can't be picked (the server answers 3032).
 */
export function useDraftDuration({
    eventId,
    options,
    currentOptionId,
    startAt,
}: {
    eventId: string;
    options: CoverageOptionResponseDto[];
    currentOptionId: string | null;
    startAt: string | null;
}) {
    const queryClient = useQueryClient();
    const { data: appConfig } = useAppConfig();
    const minDaysAfterStart = appConfig?.coverage.minDaysAfterStart;
    const updateEvent = useUpdateEvent(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);

    const tooShortOptionIds = useMemo(
        () => options.filter((option) => !coverageFitsStart({ startAt, months: option.months, minDaysAfterStart })).map((option) => option.id),
        [minDaysAfterStart, options, startAt],
    );

    const changeDuration = useCallback(
        async (optionId: string) => {
            const option = options.find((candidate) => candidate.id === optionId);
            if (!option || optionId === currentOptionId || updateEvent.isPending || tooShortOptionIds.includes(optionId)) return;
            setError(null);
            try {
                await updateEvent.mutateAsync({ coverageOptionId: optionId });
                // Show the pick until the refetch the update started confirms it.
                queryClient.setQueryData<EventBillingResponseDto>(
                    billingKeys.event(eventId),
                    (billing) => billing && { ...billing, coverageOptionId: option.id, coverageMonths: option.months },
                );
            } catch (updateError) {
                setError(toErrorMessage(updateError));
            }
        },
        [currentOptionId, eventId, options, queryClient, toErrorMessage, tooShortOptionIds, updateEvent],
    );

    // While saving, the picker already shows the new pick.
    const pendingOptionId = updateEvent.isPending ? (updateEvent.variables?.coverageOptionId ?? null) : null;

    const selectedOptionId = pendingOptionId ?? currentOptionId;

    return {
        selectedOptionId,
        tooShortOptionIds,
        // The saved duration can't cover the start, so checkout would refuse it.
        selectedTooShort: selectedOptionId !== null && tooShortOptionIds.includes(selectedOptionId),
        changeDuration,
        isSaving: updateEvent.isPending,
        error,
    };
}
