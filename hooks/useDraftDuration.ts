'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { billingKeys } from '@/hooks/useBilling';
import { useUpdateEvent } from '@/hooks/useEvent';
import type { CoverageOptionResponseDto, EventBillingResponseDto } from '@/lib/api/types';

/**
 * The duration a DRAFT event will be activated with. Checkout charges the
 * draft's saved duration, so a pick is saved straight away.
 */
export function useDraftDuration({
    eventId,
    options,
    currentOptionId,
}: {
    eventId: string;
    options: CoverageOptionResponseDto[];
    currentOptionId: string | null;
}) {
    const queryClient = useQueryClient();
    const updateEvent = useUpdateEvent(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);

    const changeDuration = useCallback(
        async (optionId: string) => {
            const option = options.find((candidate) => candidate.id === optionId);
            if (!option || optionId === currentOptionId || updateEvent.isPending) return;
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
        [currentOptionId, eventId, options, queryClient, toErrorMessage, updateEvent],
    );

    // While saving, the picker already shows the new pick.
    const pendingOptionId = updateEvent.isPending ? (updateEvent.variables?.coverageOptionId ?? null) : null;

    return {
        selectedOptionId: pendingOptionId ?? currentOptionId,
        changeDuration,
        isSaving: updateEvent.isPending,
        error,
    };
}
