'use client';

import { useCallback, useMemo } from 'react';

import { useDurationPicks } from '@/hooks/useDurationPicks';
import { useLandingPricingEventType } from '@/hooks/useLandingPricingEventType';
import { type LandingPricingEventType, useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';

// The landing pricing section's state: the event types to pick from, the one shown, and each
// card's picked duration. Switching type drops the duration picks, so every card starts on its
// plan's default.
export function useLandingPricing() {
    const { groups, defaultEventTypeId } = useLandingPricingPlans();
    const eventTypes = useMemo(() => (groups ?? []).flatMap((group) => group.items), [groups]);
    const ids = useMemo(() => eventTypes.map((eventType) => eventType.id), [eventTypes]);
    const { selectedId, selectEventType } = useLandingPricingEventType(ids, defaultEventTypeId);
    const { picks, pickDuration, resetPicks } = useDurationPicks();
    const active = eventTypes.find((eventType) => eventType.id === selectedId) ?? null;

    const pickEventType = useCallback(
        (eventType: LandingPricingEventType | null) => {
            if (!eventType || eventType.id === selectedId) return;
            resetPicks();
            selectEventType(eventType.id);
        },
        [resetPicks, selectEventType, selectedId],
    );

    return { groups: groups ?? [], active, pickEventType, picks, pickDuration };
}
