'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useSaveGift } from '@/hooks/useGift';
import { useGiftDetailsInput } from '@/hooks/useGiftDetailsInput';
import type { GiftHandoverRequestDto, PlanTierResponseDto } from '@/lib/api/types';
import { isPlanGiftable, sameGiftRequest } from '@/lib/gift';

/**
 * "Buy as a gift" in the create wizard: offered only on a plan that can be
 * given. The gift is declared on the draft right before checkout, and again only
 * when its details changed since.
 */
export function useCreateEventGift(selectedPlan: PlanTierResponseDto | undefined) {
    const details = useGiftDetailsInput();
    const saveGift = useSaveGift(null);
    const [isGift, setIsGift] = useState(false);
    const [savedRequest, setSavedRequest] = useState<GiftHandoverRequestDto | null>(null);

    const available = isPlanGiftable(selectedPlan);
    const enabled = available && isGift;

    const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => setIsGift(event.target.checked), []);

    // A fresh draft has no gift yet, so a change of draft forgets what was saved.
    const reset = useCallback(() => setSavedRequest(null), []);

    const { mutateAsync } = saveGift;
    // Throws the API error; the caller shows it and stops before checkout.
    const saveToDraft = useCallback(
        async (eventId: string) => {
            if (!enabled || !details.request || sameGiftRequest(savedRequest, details.request)) return;
            await mutateAsync({ eventId, input: details.request });
            setSavedRequest(details.request);
        },
        [details.request, enabled, mutateAsync, savedRequest],
    );

    return {
        available,
        enabled,
        handleToggle,
        details,
        // Details can't move on while a gift is picked but its required fields are empty.
        isValid: !enabled || Boolean(details.request),
        isSaving: saveGift.isPending,
        saveToDraft,
        reset,
    };
}

export type CreateEventGift = ReturnType<typeof useCreateEventGift>;
