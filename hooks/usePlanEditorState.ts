'use client';

import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useMemo, useRef, useState } from 'react';

import { type AdminTabDefinition } from '@/components/admin/AdminTabs';
import {
    eventTypeChangeSummary,
    moduleChangeSummary,
    planChangeSummary,
    planPatchFromFormData,
    sameStringSet,
    type UnlockDraft,
} from '@/lib/adminPlanEditor';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { EventTypeConvention, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

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
    const [moduleKeys, setModuleKeys] = useState(plan.moduleKeys);
    const [eventTypeKeys, setEventTypeKeys] = useState(plan.eventTypeKeys);
    const [visibility, setVisibility] = useState<Visibility>(visibilityOf(plan));
    const [planChangeCount, setPlanChangeCount] = useState(0);
    const [unlockDraft, setUnlockDraft] = useState<UnlockDraft | null>(null);

    const isEvent = scope === 'EVENT';
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    const areModulesDirty = !sameStringSet(plan.moduleKeys, moduleKeys);
    const moduleChangeCount = areModulesDirty ? moduleChangeSummary(plan.moduleKeys, moduleKeys, orderedModules).length : 0;
    const areEventTypesDirty = !sameStringSet(plan.eventTypeKeys, eventTypeKeys);
    const eventTypeChangeCount = areEventTypesDirty ? eventTypeChangeSummary(plan.eventTypeKeys, eventTypeKeys, orderedEventTypes).length : 0;
    const changeCount = planChangeCount + moduleChangeCount + eventTypeChangeCount;
    const canSave = changeCount > 0;
    const tabs = useMemo<AdminTabDefinition[]>(() => {
        const items: AdminTabDefinition[] = [
            { key: 'details', label: t('plans.tabs.details') },
            { key: 'limits', label: t('plans.tabs.limits') },
            { key: 'pricing', label: t('plans.tabs.pricing') },
        ];
        if (isEvent) {
            items.push({ key: 'modules', label: t('plans.tabs.modules'), badge: moduleKeys.length });
            items.push({ key: 'eventTypes', label: t('plans.tabs.eventTypes'), badge: eventTypeKeys.length });
        }
        items.push({ key: 'danger', label: t('plans.tabs.danger'), tone: 'danger' });
        return items;
    }, [isEvent, moduleKeys.length, eventTypeKeys.length, t]);

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

    function handleModuleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const moduleKey = event.currentTarget.value;
        setModuleKeys((current) => (current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey]));
        setUnlockDraft((current) => (current?.moduleKey === moduleKey ? null : current));
    }

    function handleEventTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        const eventTypeKey = event.currentTarget.value as EventTypeConvention;
        setEventTypeKeys((current) =>
            current.includes(eventTypeKey) ? current.filter((key) => key !== eventTypeKey) : [...current, eventTypeKey]
        );
    }

    return {
        formRef,
        tab,
        setTab,
        moduleKeys,
        setModuleKeys,
        eventTypeKeys,
        setEventTypeKeys,
        visibility,
        setVisibility,
        planChangeCount,
        setPlanChangeCount,
        unlockDraft,
        setUnlockDraft,
        orderedModules,
        orderedEventTypes,
        areModulesDirty,
        moduleChangeCount,
        areEventTypesDirty,
        eventTypeChangeCount,
        changeCount,
        canSave,
        tabs,
        isEvent,
        handleFormChange,
        handleVisibilityChange,
        handleModuleChange,
        handleEventTypeChange,
    };
}
