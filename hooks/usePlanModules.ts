'use client';

import { useMemo, useState } from 'react';

import { useAdminPlanTiers, useAdminPlatformModules, useSetPlanModules } from '@/hooks/useAdmin';
import type { ModuleKey, PlanTierResponseDto } from '@/lib/api/types';

function sameKeys(left: string[], right: string[]) {
    return left.length === right.length && left.every((key) => right.includes(key));
}

export function usePlanModules() {
    const plansQuery = useAdminPlanTiers('EVENT', true);
    const modulesQuery = useAdminPlatformModules();
    const setModules = useSetPlanModules();
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState<Record<string, ModuleKey[]>>({});

    const modules = useMemo(() => [...(modulesQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [modulesQuery.data]);
    const allPlans = useMemo(() => [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [plansQuery.data]);
    const plans = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase();
        return allPlans.filter((plan) => !needle || plan.name.toLocaleLowerCase().includes(needle) || plan.code.toLocaleLowerCase().includes(needle));
    }, [allPlans, search]);
    const pendingPlans = useMemo(() => allPlans.filter((plan) => drafts[plan.id]), [allPlans, drafts]);

    function moduleKeysFor(plan: PlanTierResponseDto) {
        return drafts[plan.id] ?? plan.moduleKeys;
    }

    function stage(plan: PlanTierResponseDto, moduleKeys: ModuleKey[]) {
        setDrafts((current) => {
            const next = { ...current };
            if (sameKeys(plan.moduleKeys, moduleKeys)) delete next[plan.id];
            else next[plan.id] = moduleKeys;
            return next;
        });
    }

    function toggleModule(plan: PlanTierResponseDto, moduleKey: ModuleKey) {
        const currentKeys = moduleKeysFor(plan);
        stage(plan, currentKeys.includes(moduleKey) ? currentKeys.filter((key) => key !== moduleKey) : [...currentKeys, moduleKey]);
    }

    function clearModules(plan: PlanTierResponseDto) {
        if (moduleKeysFor(plan).length > 0) stage(plan, []);
    }

    function discardChanges() {
        setDrafts({});
    }

    async function applyChanges() {
        for (const plan of pendingPlans) {
            const moduleKeys = drafts[plan.id];
            if (!moduleKeys) continue;
            await setModules.mutateAsync({ planId: plan.id, moduleKeys });
            setDrafts((current) => {
                const next = { ...current };
                delete next[plan.id];
                return next;
            });
        }
    }

    return {
        plans,
        modules,
        search,
        setSearch,
        moduleKeysFor,
        pendingPlanCount: pendingPlans.length,
        isApplying: setModules.isPending,
        plansQuery,
        modulesQuery,
        mutationError: setModules.error,
        toggleModule,
        clearModules,
        discardChanges,
        applyChanges,
    };
}
