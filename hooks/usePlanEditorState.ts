'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { planChangeSummary, planPatchFromFormData, type UnlockDraft } from '@/lib/adminPlanEditor';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

type UsePlanEditorStateArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
};

export function usePlanEditorState({ plan, modules, eventTypes, scope }: UsePlanEditorStateArgs) {
    const t = useTranslations('AdminPage');
    const formRef = useRef<HTMLFormElement>(null);
    const [visibility, setVisibility] = useState<Visibility>(visibilityOf(plan));
    const [planChangeCount, setPlanChangeCount] = useState(0);
    const [unlockDraft, setUnlockDraft] = useState<UnlockDraft | null>(null);

    const isEvent = scope === 'EVENT';
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);

    function recomputePlanChanges(currentVisibility: Visibility) {
        if (!formRef.current) return;
        const patch = planPatchFromFormData(plan, new FormData(formRef.current), currentVisibility);
        setPlanChangeCount(planChangeSummary(plan, patch, t).length);
    }

    function handleFormChange() {
        recomputePlanChanges(visibility);
    }

    function handleVisibilityChange(next: Visibility) {
        setVisibility(next);
        recomputePlanChanges(next);
    }

    return {
        formRef,
        visibility,
        setVisibility,
        planChangeCount,
        setPlanChangeCount,
        unlockDraft,
        setUnlockDraft,
        orderedModules,
        orderedEventTypes,
        changeCount: planChangeCount,
        canSave: planChangeCount > 0,
        isEvent,
        handleFormChange,
        handleVisibilityChange,
    };
}
