'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlanTiers, useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useLocalizedEventTypeName } from '@/hooks/useLocalizedEventTypeName';

export type ModuleUsageFilterOption = { value: string; label: string };

// Event type and plan narrowing for the module usage table. Empty means "all".
export function useModuleUsageFilters() {
    const [eventTypeKey, setEventTypeKey] = useState('');
    const [planCode, setPlanCode] = useState('');
    const eventTypesQuery = useAdminPlatformEventTypes();
    // Archived plans too: events created on them still count.
    const planTiersQuery = useAdminPlanTiers(undefined, true);
    const eventTypeName = useLocalizedEventTypeName();

    const eventTypeOptions = useMemo<ModuleUsageFilterOption[]>(
        () => (eventTypesQuery.data ?? []).map((eventType) => ({ value: eventType.eventTypeKey, label: eventTypeName(eventType) })),
        [eventTypeName, eventTypesQuery.data],
    );

    const planOptions = useMemo<ModuleUsageFilterOption[]>(() => {
        const seen = new Set<string>();
        return (planTiersQuery.data ?? []).flatMap((plan) => {
            if (seen.has(plan.code)) return [];
            seen.add(plan.code);
            return [{ value: plan.code, label: plan.name }];
        });
    }, [planTiersQuery.data]);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setEventTypeKey(event.target.value), []);
    const handlePlanChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setPlanCode(event.target.value), []);

    return { eventTypeKey, planCode, eventTypeOptions, planOptions, handleEventTypeChange, handlePlanChange };
}
