'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';

export const PLAN_MODULE_GRID_ID = 'plan-module-grid';

// Drawer, create/duplicate, and saved-banner state for one event type's pane.
export function useEventTypePlansPane(plans: PlanTierResponseDto[], selectEventType: (key: string) => void) {
    const t = useTranslations('AdminPage.plans');
    const [createOpen, setCreateOpen] = useState(false);
    const [duplicatePlanId, setDuplicatePlanId] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);
    const duplicatePlan = useMemo(() => plans.find((plan) => plan.id === duplicatePlanId) ?? null, [plans, duplicatePlanId]);

    const openCreate = useCallback(() => {
        setDuplicatePlanId(null);
        setCreateOpen(true);
    }, []);
    const closeCreate = useCallback(() => {
        setCreateOpen(false);
        setDuplicatePlanId(null);
    }, []);
    const closeEditor = useCallback(() => setSelectedPlanId(null), []);

    const handleEditClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const planId = event.currentTarget.dataset.planId;
        if (planId) setSelectedPlanId(planId);
    }, []);
    const handleDuplicateClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const planId = event.currentTarget.dataset.planId;
        if (!planId) return;
        setDuplicatePlanId(planId);
        setCreateOpen(true);
    }, []);

    const handleCreated = useCallback(
        (name: string) => {
            setCreateOpen(false);
            setDuplicatePlanId(null);
            setSavedMessage(t('create.createSuccess', { plan: name }));
        },
        [t],
    );
    const handleSaved = useCallback(
        (name: string) => {
            setSelectedPlanId(null);
            setSavedMessage(t('saveSuccess', { plan: name }));
        },
        [t],
    );

    // The drawer's "edit in grid" link: close, then bring the grid into view.
    const openGridFromEditor = useCallback(() => {
        setSelectedPlanId(null);
        requestAnimationFrame(() => document.getElementById(PLAN_MODULE_GRID_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, []);

    const openSibling = useCallback(
        (sibling: PlanTierResponseDto) => {
            if (sibling.eventTypeKey) selectEventType(sibling.eventTypeKey);
        },
        [selectEventType],
    );

    useEffect(() => {
        if (!savedMessage) return;
        const timeoutId = setTimeout(() => setSavedMessage(null), 4000);
        return () => clearTimeout(timeoutId);
    }, [savedMessage]);

    return {
        createOpen,
        duplicatePlan,
        selectedPlan,
        savedMessage,
        openCreate,
        closeCreate,
        closeEditor,
        handleEditClick,
        handleDuplicateClick,
        handleCreated,
        handleSaved,
        openGridFromEditor,
        openSibling,
    };
}
