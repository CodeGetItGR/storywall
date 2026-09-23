'use client';

import { useCallback, useMemo, useState } from 'react';

import { useCodeRestrictionOptions } from '@/hooks/useCodeRestrictionOptions';
import { restrictionEventTypesWithPlans, unknownRestrictionValues } from '@/lib/adminCollaborations';
import type { CodeRestrictionsDto } from '@/lib/api/types';

// Event types are picked first; only the plans of the picked types are offered.
export function useCodeRestrictionPicker(restrictions: CodeRestrictionsDto | null) {
    const { isLoading, eventTypes, planGroups } = useCodeRestrictionOptions();
    const [pickedEventTypes, setPickedEventTypes] = useState<string[] | null>(null);

    // A stored plan implies its event type, so ticking that type too keeps the same meaning.
    const selectedEventTypes = useMemo(
        () => pickedEventTypes ?? restrictionEventTypesWithPlans(restrictions, planGroups),
        [pickedEventTypes, planGroups, restrictions]
    );

    const visiblePlanGroups = useMemo(() => planGroups.filter((group) => selectedEventTypes.includes(group.key)), [planGroups, selectedEventTypes]);

    const unknown = useMemo(
        () =>
            unknownRestrictionValues(
                restrictions,
                eventTypes.map((eventType) => eventType.value),
                planGroups.flatMap((group) => group.plans.map((plan) => plan.value))
            ),
        [eventTypes, planGroups, restrictions]
    );

    const handleEventTypeChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const { checked, value } = event.currentTarget;
            setPickedEventTypes(checked ? [...selectedEventTypes, value] : selectedEventTypes.filter((key) => key !== value));
        },
        [selectedEventTypes]
    );

    return {
        isLoading,
        eventTypes,
        selectedEventTypes,
        visiblePlanGroups,
        selectedPlans: restrictions?.planTierCodes ?? [],
        unknown,
        handleEventTypeChange,
    };
}
