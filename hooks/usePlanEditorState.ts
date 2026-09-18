'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { type AdminTabDefinition } from '@/components/admin/AdminTabs';
import { planChangeSummary, planPatchFromFormData, type UnlockDraft } from '@/lib/adminPlanEditor';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

function sameMembers(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((item) => rightSet.has(item));
}

type UsePlanEditorStateArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
};

export function usePlanEditorState({ plan, modules, eventTypes, scope }: UsePlanEditorStateArgs) {
    const t = useTranslations('AdminPage');
    const formRef = useRef<HTMLFormElement>(null);
    const [tab, setTab] = useState('details');
    const [visibility, setVisibility] = useState<Visibility>(visibilityOf(plan));
    const [planChangeCount, setPlanChangeCount] = useState(0);
    const [unlockDraft, setUnlockDraft] = useState<UnlockDraft | null>(null);
    const [moduleKeysDraft, setModuleKeysDraft] = useState<string[]>(plan.moduleKeys);

    const isEvent = scope === 'EVENT';
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    const modulesDirty = !sameMembers(moduleKeysDraft, plan.moduleKeys);
    // The footer speaks for the whole editor, so coverage edits have to count
    // toward it — otherwise it reports "no changes" over a pending edit.
    const changeCount = planChangeCount + (modulesDirty ? 1 : 0);
    const canSave = changeCount > 0;
    const tabs = useMemo<AdminTabDefinition[]>(() => {
        const items: AdminTabDefinition[] = [
            { key: 'details', label: t('plans.tabs.details') },
            { key: 'limits', label: t('plans.tabs.limits') },
            { key: 'pricing', label: t('plans.tabs.pricing') },
        ];
        if (isEvent) {
            items.push({ key: 'coverage', label: t('plans.tabs.coverage') });
            items.push({ key: 'addons', label: t('plans.tabs.addons') });
        }
        items.push({ key: 'danger', label: t('plans.tabs.danger'), tone: 'danger' });
        return items;
    }, [isEvent, t]);

    function toggleModule(key: string, next: boolean) {
        setModuleKeysDraft((current) => (next ? [...current, key] : current.filter((item) => item !== key)));
    }

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
        tab,
        setTab,
        visibility,
        setVisibility,
        planChangeCount,
        setPlanChangeCount,
        unlockDraft,
        setUnlockDraft,
        orderedModules,
        orderedEventTypes,
        changeCount,
        canSave,
        tabs,
        isEvent,
        moduleKeysDraft,
        setModuleKeysDraft,
        modulesDirty,
        toggleModule,
        handleFormChange,
        handleVisibilityChange,
    };
}
