'use client';

import { useList } from '@refinedev/core';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminPaidServices, useAdminPlatformEventTypes, useAdminPlatformModules } from '@/hooks/useAdmin';
import { formatPlansHash, parsePlansHash, type PlansView } from '@/lib/adminPlansRouting';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';

export type PlanStatusFilterValue = Visibility | 'ALL';

function currentView(): PlansView {
    if (typeof window === 'undefined') return { view: 'eventType', key: null };
    return parsePlansHash(window.location.hash);
}

export function usePlansSection() {
    const [view, setViewState] = useState<PlansView>(currentView);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<PlanStatusFilterValue>('ALL');

    const eventTypesQuery = useAdminPlatformEventTypes();
    const modulesQuery = useAdminPlatformModules();
    const unlocksQuery = useAdminPaidServices('MODULE_UNLOCK', true);
    const { result: plansResult, query: plansQuery } = useList<PlanTierResponseDto>({
        resource: 'plan-tiers',
        dataProviderName: 'plan-tiers',
        filters: [
            { field: 'scope', operator: 'eq', value: 'EVENT' },
            { field: 'includeArchived', operator: 'eq', value: true },
        ],
        pagination: { mode: 'off' },
    });

    useEffect(() => {
        function syncFromHash() {
            setViewState(currentView());
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const setView = useCallback((next: PlansView) => {
        setViewState(next);
        window.history.replaceState(null, '', formatPlansHash(next));
    }, []);

    const orderedEventTypes = useMemo(
        () => [...(eventTypesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
        [eventTypesQuery.data]
    );
    const allPlans = useMemo(() => [...plansResult.data].sort((left, right) => left.sortOrder - right.sortOrder), [plansResult.data]);

    // `#plans` with no key resolves to the first enabled type once types load.
    const selectedEventTypeKey = useMemo(() => {
        if (view.view !== 'eventType') return null;
        if (view.key) return view.key;
        return orderedEventTypes.find((type) => type.isEnabled)?.eventTypeKey ?? orderedEventTypes[0]?.eventTypeKey ?? null;
    }, [orderedEventTypes, view]);

    const selectedEventType = useMemo(
        () => orderedEventTypes.find((type) => type.eventTypeKey === selectedEventTypeKey) ?? null,
        [orderedEventTypes, selectedEventTypeKey]
    );

    const needle = search.trim().toLowerCase();

    const plansForType = useMemo(() => allPlans.filter((plan) => plan.eventTypeKey === selectedEventTypeKey), [allPlans, selectedEventTypeKey]);

    const visiblePlans = useMemo(
        () =>
            plansForType.filter((plan) => {
                if (statusFilter !== 'ALL' && visibilityOf(plan) !== statusFilter) return false;
                if (!needle) return true;
                return plan.name.toLowerCase().includes(needle) || plan.code.toLowerCase().includes(needle);
            }),
        [needle, plansForType, statusFilter]
    );

    const statusCounts = useMemo(() => {
        const counts: Record<PlanStatusFilterValue, number> = { ALL: plansForType.length, LIVE: 0, HIDDEN: 0, ARCHIVED: 0 };
        for (const plan of plansForType) counts[visibilityOf(plan)] += 1;
        return counts;
    }, [plansForType]);

    // The rail filters types by key and by whether any of their plans match.
    const railEventTypes = useMemo(
        () =>
            orderedEventTypes
                .map((type) => {
                    const typePlans = allPlans.filter((plan) => plan.eventTypeKey === type.eventTypeKey);
                    return { type, liveCount: typePlans.filter((plan) => visibilityOf(plan) === 'LIVE').length, plans: typePlans };
                })
                .filter(({ type, plans }) => {
                    if (!needle) return true;
                    if (type.eventTypeKey.toLowerCase().includes(needle)) return true;
                    return plans.some((plan) => plan.name.toLowerCase().includes(needle) || plan.code.toLowerCase().includes(needle));
                }),
        [allPlans, needle, orderedEventTypes]
    );

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);
    const selectEventType = useCallback((key: string) => setView({ view: 'eventType', key }), [setView]);
    const openSettingsModules = useCallback(() => setView({ view: 'settingsModules', key: null }), [setView]);
    const openSettingsEventTypes = useCallback(() => setView({ view: 'settingsEventTypes', key: null }), [setView]);

    return {
        view,
        selectedEventTypeKey,
        selectedEventType,
        orderedEventTypes,
        railEventTypes,
        allPlans,
        plansForType,
        visiblePlans,
        statusFilter,
        setStatusFilter,
        statusCounts,
        search,
        handleSearchChange,
        selectEventType,
        openSettingsModules,
        openSettingsEventTypes,
        modules: modulesQuery.data ?? [],
        unlocks: unlocksQuery.data ?? [],
        isLoading: plansQuery.isLoading || eventTypesQuery.isLoading,
        error: plansQuery.error ?? eventTypesQuery.error ?? null,
    };
}

export type PlansSectionState = ReturnType<typeof usePlansSection>;
