'use client';

import { useDelete, useInvalidate, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useAdminDrawerFooterSlot } from '@/components/admin/AdminDrawer';
import { useSetPlanModules } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import { usePlanEditorState } from '@/hooks/usePlanEditorState';
import { usePlanEditorUnlocks } from '@/hooks/usePlanEditorUnlocks';
import { membershipDelta, type PendingPlanSave, planChangeSummary, type PlanMembershipChange, planPatchFromFormData } from '@/lib/adminPlanEditor';
import { type Visibility } from '@/lib/adminVisibility';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export type UsePlanEditorCardArgs = {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
    onSavedAction: (name: string) => void;
};

export function usePlanEditorCard({ plan, modules, eventTypes, paidServices, eventPlans, scope, onSavedAction }: UsePlanEditorCardArgs) {
    const t = useTranslations('AdminPage');
    const moduleLabel = useLocalizedModuleLabel(modules);
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const footerSlot = useAdminDrawerFooterSlot();
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

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
    const setPlanModules = useSetPlanModules();

    const editor = usePlanEditorState({ plan, modules, eventTypes, scope });
    const unlocks = usePlanEditorUnlocks({
        plan,
        eventPlans,
        paidServices,
        orderedModules: editor.orderedModules,
        unlockDraft: editor.unlockDraft,
        setUnlockDraftAction: editor.setUnlockDraft,
    });

    const error =
        updatePlan.mutation.error ??
        deletePlan.mutation.error ??
        unlocks.createPaidService.mutation.error ??
        unlocks.updatePaidService.mutation.error ??
        setPlanModules.error;
    const isSaving = updatePlan.mutation.isPending || setPlanModules.isPending;

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

    // One Save covers the whole editor: the plan patch plus whichever coverage
    // lists changed. The card is remounted on success, which resets the drafts.
    async function handleSaveConfirm() {
        if (!pendingSave) return;
        if (pendingSave.changes.length > 0) {
            await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: pendingSave.patch });
        }
        if (pendingSave.moduleKeys) {
            await setPlanModules.mutateAsync({ planId: plan.id, moduleKeys: pendingSave.moduleKeys });
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

        const moduleName = (key: string) => moduleLabel(key).name;

        const memberships: PlanMembershipChange[] = [];
        if (editor.modulesDirty) {
            const delta = membershipDelta(plan.moduleKeys, editor.moduleKeysDraft);
            memberships.push({
                label: t('plans.includedModules'),
                added: delta.added.map(moduleName),
                removed: delta.removed.map(moduleName),
            });
        }

        setPendingSave({
            patch,
            changes: planChangeSummary(plan, patch, t),
            memberships,
            moduleKeys: editor.modulesDirty ? editor.moduleKeysDraft : null,
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

    return {
        plan,
        isEvent: editor.isEvent,
        tabs: editor.tabs,
        tab: editor.tab,
        setTab: editor.setTab,
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
        editorId: `plan-editor-${plan.id}`,
        orderedModules: editor.orderedModules,
        orderedEventTypes: editor.orderedEventTypes,
        moduleUnlocks: unlocks.moduleUnlocks,
        moduleKeysDraft: editor.moduleKeysDraft,
        modulesDirty: editor.modulesDirty,
        toggleModule: editor.toggleModule,
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
        openUnlockEditor: unlocks.openUnlockEditor,
        closeUnlockEditor: unlocks.closeUnlockEditor,
        updateUnlockDraft: unlocks.updateUnlockDraft,
        handleCreateUnlockClick: unlocks.handleCreateUnlockClick,
        canCreateUnlock: unlocks.canCreateUnlock,
        handleUnlockAction: unlocks.handleUnlockAction,
    };
}
