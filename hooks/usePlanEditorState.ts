'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { type AdminTabDefinition } from '@/components/admin/AdminTabs';
import { planChangeSummary, planPatchFromFormData, type UnlockDraft } from '@/lib/adminPlanEditor';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

type UsePlanEditorStateArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
};

export function usePlanEditorState({ plan, modules, scope }: UsePlanEditorStateArgs) {
    const t = useTranslations('AdminPage');
    const formRef = useRef<HTMLFormElement>(null);
    const [tab, setTab] = useState('details');
    const [visibility, setVisibility] = useState<Visibility>(visibilityOf(plan));
    const [planChangeCount, setPlanChangeCount] = useState(0);
    const [unlockDraft, setUnlockDraft] = useState<UnlockDraft | null>(null);

    const isEvent = scope === 'EVENT';
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const changeCount = planChangeCount;
    const canSave = changeCount > 0;
    const tabs = useMemo<AdminTabDefinition[]>(() => {
        const items: AdminTabDefinition[] = [
            { key: 'details', label: t('plans.tabs.details') },
            { key: 'limits', label: t('plans.tabs.limits') },
            { key: 'pricing', label: t('plans.tabs.pricing') },
        ];
        if (isEvent) {
            items.push({ key: 'addons', label: t('plans.tabs.addons') });
        }
        items.push({ key: 'danger', label: t('plans.tabs.danger'), tone: 'danger' });
        return items;
    }, [isEvent, t]);

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
        changeCount,
        canSave,
        tabs,
        isEvent,
        handleFormChange,
        handleVisibilityChange,
    };
}
