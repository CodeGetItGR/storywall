'use client';

import { useDelete, useInvalidate, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useAdminDrawerFooterSlot } from '@/components/admin/AdminDrawer';
import type { PlanEditorAnchor } from '@/components/admin/PlanEditorAnchors';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { usePlanEditorState } from '@/hooks/usePlanEditorState';
import { usePlanEditorUnlocks } from '@/hooks/usePlanEditorUnlocks';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { type PendingPlanSave, planChangeSummary, planPatchFromFormData } from '@/lib/adminPlanEditor';
import { type Visibility } from '@/lib/adminVisibility';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

const SECTION_KEYS = ['details', 'availability', 'limits', 'pricing', 'modules', 'addons', 'danger'] as const;

export type UsePlanEditorCardArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
    onSavedAction: (name: string) => void;
    onOpenGridAction?: () => void;
    onOpenSiblingAction?: (plan: PlanTierResponseDto) => void;
};

export function usePlanEditorCard({
    plan,
    modules,
    eventTypes,
    paidServices,
    eventPlans,
    scope,
    onSavedAction,
    onOpenGridAction,
    onOpenSiblingAction,
}: UsePlanEditorCardArgs) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const footerSlot = useAdminDrawerFooterSlot();
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const editorId = `plan-editor-${plan.id}`;
    const anchorIds = useMemo(() => SECTION_KEYS.map((key) => `${editorId}-${key}`), [editorId]);
    const activeAnchor = useScrollSpy(anchorIds);
    const anchors: PlanEditorAnchor[] = SECTION_KEYS.map((key) => ({
        id: `${editorId}-${key}`,
        label: t(`plans.sections.${key}`),
        tone: key === 'danger' ? 'danger' : 'default',
    }));

    const siblings = useMemo(
        () => eventPlans.filter((other) => other.sharedGroupKey && other.sharedGroupKey === plan.sharedGroupKey && other.id !== plan.id),
        [eventPlans, plan.id, plan.sharedGroupKey]
    );

    const invalidateAppConfig = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
    // Keep the catalog and public config in sync after drawer edits.
    const invalidatePlanTiersList = () => {
        invalidate({ resource: 'plan-tiers', dataProviderName: 'plan-tiers', invalidates: ['list'] });
    };
    const onMutationSuccess = () => {
        invalidateAppConfig();
        invalidatePlanTiersList();
    };

    const updatePlan = useUpdate<PlanTierResponseDto>({ dataProviderName: 'plan-tiers', mutationOptions: { onSuccess: onMutationSuccess } });
    // useDelete's mutationOptions doesn't expose onSuccess, unlike useCreate/useUpdate — invalidate manually after it resolves.
    const deletePlan = useDelete<PlanTierResponseDto>();

    const editor = usePlanEditorState({ plan, modules, eventTypes, scope });
    const unlocks = usePlanEditorUnlocks({
        plan,
        eventPlans,
        paidServices,
        orderedModules: editor.orderedModules,
        unlockDraft: editor.unlockDraft,
        setUnlockDraftAction: editor.setUnlockDraft,
    });

    const error = updatePlan.mutation.error ?? deletePlan.mutation.error ?? unlocks.createPaidService.mutation.error ?? unlocks.updatePaidService.mutation.error;
    const isSaving = updatePlan.mutation.isPending;

    function handleMakeDefaultClick() {
        setMakeDefaultOpen(true);
    }

    function handleMakeDefaultClose() {
        setMakeDefaultOpen(false);
    }

    async function handleMakeDefaultConfirm() {
        await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: { isDefault: true } });
        setMakeDefaultOpen(false);
    }

    function handleDeleteOpenClick() {
        setDeleteOpen(true);
    }

    function handleDeleteClose() {
        setDeleteOpen(false);
    }

    function handleSaveClose() {
        setPendingSave(null);
    }

    // Module membership is edited in the grid, so one Save is just the plan
    // patch. The card is remounted on success, which resets the form.
    async function handleSaveConfirm() {
        if (!pendingSave) return;
        if (pendingSave.changes.length > 0) {
            await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: pendingSave.patch });
        }
        editor.setPlanChangeCount(0);
        setPendingSave(null);
        onSavedAction(plan.name);
    }

    async function handleDeleteConfirm() {
        await deletePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, dataProviderName: 'plan-tiers' });
        invalidateAppConfig();
        setDeleteOpen(false);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editor.canSave) return;
        const patch = planPatchFromFormData(plan, new FormData(event.currentTarget), editor.visibility);
        setPendingSave({ patch, changes: planChangeSummary(plan, patch, t), memberships: [], moduleKeys: null });
    }

    function handleVisibilityChange(next: Visibility) {
        editor.handleVisibilityChange(next);
    }

    return {
        plan,
        isEvent: editor.isEvent,
        editorId,
        anchors,
        activeAnchor,
        siblings,
        onOpenGridAction,
        onOpenSiblingAction,
        visibility: editor.visibility,
        unlockDraft: editor.unlockDraft,
        error,
        canSave: editor.canSave,
        isSaving,
        changeCount: editor.changeCount,
        updatePlan,
        deletePlan,
        createPaidService: unlocks.createPaidService,
        updatePaidService: unlocks.updatePaidService,
        makeDefaultOpen,
        pendingSave,
        deleteOpen,
        footerSlot,
        formRef: editor.formRef,
        orderedModules: editor.orderedModules,
        orderedEventTypes: editor.orderedEventTypes,
        moduleUnlocks: unlocks.moduleUnlocks,
        handleMakeDefaultClick,
        handleMakeDefaultClose,
        handleMakeDefaultConfirm,
        handleDeleteOpenClick,
        handleDeleteClose,
        handleSaveClose,
        handleSaveConfirm,
        handleDeleteConfirm,
        handleSubmit,
        handleFormChange: editor.handleFormChange,
        handleVisibilityChange,
        openUnlockEditor: unlocks.openUnlockEditor,
        closeUnlockEditor: unlocks.closeUnlockEditor,
        updateUnlockDraft: unlocks.updateUnlockDraft,
        handleCreateUnlockClick: unlocks.handleCreateUnlockClick,
        canCreateUnlock: unlocks.canCreateUnlock,
        handleUnlockAction: unlocks.handleUnlockAction,
    };
}
