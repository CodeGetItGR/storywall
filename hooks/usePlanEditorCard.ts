'use client';

import { useCustomMutation, useDelete, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useAdminDrawerFooterSlot } from '@/components/admin/AdminDrawer';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { usePlanEditorState } from '@/hooks/usePlanEditorState';
import { usePlanEditorUnlocks } from '@/hooks/usePlanEditorUnlocks';
import { moduleChangeSummary, type PendingPlanSave, planChangeSummary, planPatchFromFormData } from '@/lib/adminPlanEditor';
import { type Visibility } from '@/lib/adminVisibility';
import { endpoints } from '@/lib/api/endpoints';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export type UsePlanEditorCardArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
};

export function usePlanEditorCard({ plan, modules, paidServices, eventPlans, scope }: UsePlanEditorCardArgs) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const footerSlot = useAdminDrawerFooterSlot();
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const invalidateAppConfig = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };

    const updatePlan = useUpdate<PlanTierResponseDto>({ dataProviderName: 'plan-tiers', mutationOptions: { onSuccess: invalidateAppConfig } });
    // useDelete's mutationOptions doesn't expose onSuccess, unlike useCreate/useUpdate — invalidate manually after it resolves.
    const deletePlan = useDelete<PlanTierResponseDto>();
    const setModules = useCustomMutation<PlanTierResponseDto>({ mutationOptions: { onSuccess: invalidateAppConfig } });

    const editor = usePlanEditorState({ plan, modules, scope });
    const unlocks = usePlanEditorUnlocks({
        plan,
        eventPlans,
        paidServices,
        orderedModules: editor.orderedModules,
        unlockDraft: editor.unlockDraft,
        setUnlockDraft: editor.setUnlockDraft,
    });

    const error =
        updatePlan.mutation.error ??
        deletePlan.mutation.error ??
        setModules.mutation.error ??
        unlocks.createPaidService.mutation.error ??
        unlocks.updatePaidService.mutation.error;
    const isSaving = updatePlan.mutation.isPending || setModules.mutation.isPending;

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

    async function handleSaveConfirm() {
        if (!pendingSave) return;
        if (pendingSave.changes.length > 0) {
            await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: pendingSave.patch });
        }
        if (pendingSave.moduleChanges.length > 0) {
            await setModules.mutateAsync({
                url: endpoints.admin.planTiers.modules(plan.id),
                method: 'put',
                values: { moduleKeys: pendingSave.moduleKeys },
                dataProviderName: 'plan-tiers',
            });
        }
        editor.setPlanChangeCount(0);
        setPendingSave(null);
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
        setPendingSave({
            patch,
            moduleKeys: editor.moduleKeys,
            changes: planChangeSummary(plan, patch, t),
            moduleChanges: moduleChangeSummary(plan.moduleKeys, editor.moduleKeys, editor.orderedModules),
        });
    }

    // Recompute the full change summary from the live form state whenever the form changes.
    function handleFormChange() {
        if (!editor.formRef.current) return;
        const patch = planPatchFromFormData(plan, new FormData(editor.formRef.current), editor.visibility);
        editor.setPlanChangeCount(planChangeSummary(plan, patch, t).length);
    }

    function handleVisibilityChange(next: Visibility) {
        editor.handleVisibilityChange(next);
    }

    function handleModuleChange(event: React.ChangeEvent<HTMLInputElement>) {
        editor.handleModuleChange(event);
    }

    return {
        plan,
        isEvent: editor.isEvent,
        tabs: editor.tabs,
        tab: editor.tab,
        setTab: editor.setTab,
        visibility: editor.visibility,
        moduleKeys: editor.moduleKeys,
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
        editorId: `plan-editor-${plan.id}`,
        orderedModules: editor.orderedModules,
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
        handleFormChange,
        handleVisibilityChange,
        handleModuleChange,
        openUnlockEditor: unlocks.openUnlockEditor,
        closeUnlockEditor: unlocks.closeUnlockEditor,
        updateUnlockDraft: unlocks.updateUnlockDraft,
        handleCreateUnlockClick: unlocks.handleCreateUnlockClick,
        canCreateUnlock: unlocks.canCreateUnlock,
        handleUnlockAction: unlocks.handleUnlockAction,
    };
}
