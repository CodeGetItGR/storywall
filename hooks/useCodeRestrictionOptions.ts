'use client';

import { useCallback, useMemo } from 'react';

import { useAdminPlanTiers, useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';

export type CodeRestrictionOption = { value: string; label: string };
export type CodeRestrictionPlanGroup = { key: string; label: string; plans: CodeRestrictionOption[] };

// Event types and event plans a discount or partner code can be limited to.
// Archived plans are included so a stored restriction on one survives an edit.
export function useCodeRestrictionOptions() {
    const eventTypesQuery = useAdminPlatformEventTypes();
    const plansQuery = useAdminPlanTiers('EVENT', true);
    const eventTypeName = useLocalizedEventTypeName();

    const eventTypes = useMemo<CodeRestrictionOption[]>(
        () =>
            [...(eventTypesQuery.data ?? [])]
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((eventType) => ({ value: eventType.eventTypeKey, label: eventTypeName(eventType) })),
        [eventTypeName, eventTypesQuery.data],
    );

    const planGroups = useMemo<CodeRestrictionPlanGroup[]>(() => {
        const plans = [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
        const groups = eventTypes.map((eventType) => ({
            key: eventType.value,
            label: eventType.label,
            plans: plans.filter((plan) => plan.eventTypeKey === eventType.value).map((plan) => ({ value: plan.code, label: plan.name })),
        }));
        const ungrouped = plans.filter((plan) => !eventTypes.some((eventType) => eventType.value === plan.eventTypeKey));
        if (ungrouped.length > 0) {
            groups.push({ key: 'other', label: '', plans: ungrouped.map((plan) => ({ value: plan.code, label: plan.name })) });
        }
        return groups.filter((group) => group.plans.length > 0);
    }, [eventTypes, plansQuery.data]);

    const eventTypeLabel = useCallback(
        (eventTypeKey: string) => eventTypes.find((eventType) => eventType.value === eventTypeKey)?.label ?? eventTypeKey,
        [eventTypes],
    );

    return {
        isLoading: eventTypesQuery.isLoading || plansQuery.isLoading,
        eventTypes,
        planGroups,
        eventTypeLabel,
    };
}
