'use client';

import { useMemo, useState } from 'react';

import { useAdminPlanTiers, useAdminPlatformEventTypes, useSetPlanEventTypes } from '@/hooks/useAdmin';
import type { EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';

function sameKeys(left: string[], right: string[]) {
    return left.length === right.length && left.every((key) => right.includes(key));
}

export function usePlanAvailability() {
    const plansQuery = useAdminPlanTiers('EVENT', true);
    const eventTypesQuery = useAdminPlatformEventTypes();
    const setEventTypes = useSetPlanEventTypes();
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState<Record<string, EventTypeConvention[]>>({});

    const eventTypes = useMemo(
        () => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data]
    );
    const allPlans = useMemo(() => [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [plansQuery.data]);
    const plans = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase();
        return allPlans.filter((plan) => !needle || plan.name.toLocaleLowerCase().includes(needle) || plan.code.toLocaleLowerCase().includes(needle));
    }, [allPlans, search]);
    const pendingPlans = useMemo(() => allPlans.filter((plan) => drafts[plan.id]), [allPlans, drafts]);

    function eventTypeKeysFor(plan: PlanTierResponseDto) {
        return drafts[plan.id] ?? plan.eventTypeKeys;
    }

    function stage(plan: PlanTierResponseDto, eventTypeKeys: EventTypeConvention[]) {
        setDrafts((current) => {
            const next = { ...current };
            if (sameKeys(plan.eventTypeKeys, eventTypeKeys)) delete next[plan.id];
            else next[plan.id] = eventTypeKeys;
            return next;
        });
    }

    function setAll(plan: PlanTierResponseDto) {
        if (eventTypeKeysFor(plan).length > 0) stage(plan, []);
    }

    function toggleEventType(plan: PlanTierResponseDto, eventTypeKey: EventTypeConvention) {
        const allKeys = eventTypes.map((eventType) => eventType.eventTypeKey);
        const planKeys = eventTypeKeysFor(plan);
        const currentKeys = planKeys.length === 0 ? allKeys : planKeys;
        const included = currentKeys.includes(eventTypeKey);
        if (included && currentKeys.length === 1) return;

        const nextKeys = included ? currentKeys.filter((key) => key !== eventTypeKey) : [...currentKeys, eventTypeKey];
        stage(plan, allKeys.every((key) => nextKeys.includes(key)) ? [] : nextKeys);
    }

    function discardChanges() {
        setDrafts({});
    }

    async function applyChanges() {
        for (const plan of pendingPlans) {
            const eventTypeKeys = drafts[plan.id];
            if (!eventTypeKeys) continue;
            await setEventTypes.mutateAsync({ planId: plan.id, eventTypeKeys });
            setDrafts((current) => {
                const next = { ...current };
                delete next[plan.id];
                return next;
            });
        }
    }

    return {
        plans,
        eventTypes,
        search,
        setSearch,
        eventTypeKeysFor,
        pendingPlanCount: pendingPlans.length,
        isApplying: setEventTypes.isPending,
        plansQuery,
        eventTypesQuery,
        mutationError: setEventTypes.error,
        setAll,
        toggleEventType,
        discardChanges,
        applyChanges,
    };
}
