'use client';

import { useTranslations } from 'next-intl';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { PlanEditorAddonsTab } from '@/components/admin/PlanEditorAddonsTab';
import { PlanEditorDangerTab } from '@/components/admin/PlanEditorDangerTab';
import { PlanEditorDetailsTab } from '@/components/admin/PlanEditorDetailsTab';
import { PlanEditorFooter } from '@/components/admin/PlanEditorFooter';
import { PlanEditorHeader } from '@/components/admin/PlanEditorHeader';
import { PlanEditorLimitsTab } from '@/components/admin/PlanEditorLimitsTab';
import { PlanEditorPricingTab } from '@/components/admin/PlanEditorPricingTab';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePlanEditorCard } from '@/hooks/usePlanEditorCard';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanEditorCard({
    plan,
    modules,
    paidServices,
    eventPlans,
    scope,
    onSavedAction,
}: {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
    onSavedAction: (name: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const {
        plan: editorPlan,
        isEvent,
        tabs,
        tab,
        setTab,
        visibility,
        unlockDraft,
        error,
        canSave,
        isSaving,
        changeCount,
        updatePlan,
        deletePlan,
        createPaidService,
        updatePaidService,
        makeDefaultOpen,
        pendingSave,
        deleteOpen,
        footerSlot,
        formRef,
        editorId,
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
        openUnlockEditor,
        closeUnlockEditor,
        updateUnlockDraft,
        handleCreateUnlockClick,
        canCreateUnlock,
        orderedModules,
        moduleUnlocks,
        handleUnlockAction,
    } = usePlanEditorCard({ plan, modules, paidServices, eventPlans, scope, onSavedAction: onSavedAction });

    return (
        <article className={cn('min-w-0', plan.isAssignable ? '' : 'opacity-90')}>
            {/* Header */}
            <PlanEditorHeader
                plan={editorPlan}
                isEvent={isEvent}
                isMakingDefault={updatePlan.mutation.isPending}
                onMakeDefaultAction={handleMakeDefaultClick}
            />

            {/* Form */}
            <form ref={formRef} id={`${editorId}-form`} onSubmit={handleSubmit} onChange={handleFormChange}>
                {/* Tabs */}
                <AdminTabs id={editorId} tabs={tabs} active={tab} onSelectAction={setTab} className="mt-4" />

                {/* Details tab */}
                <PlanEditorDetailsTab
                    editorId={editorId}
                    activeTab={tab}
                    plan={editorPlan}
                    visibility={visibility}
                    onVisibilityChangeAction={handleVisibilityChange}
                />

                {/* Limits tab */}
                <PlanEditorLimitsTab editorId={editorId} activeTab={tab} plan={editorPlan} isEvent={isEvent} />

                {/* Pricing tab */}
                <PlanEditorPricingTab editorId={editorId} activeTab={tab} plan={editorPlan} isEvent={isEvent} />

                {/* Add-ons tab */}
                {isEvent && (
                    <PlanEditorAddonsTab
                        editorId={editorId}
                        activeTab={tab}
                        plan={editorPlan}
                        orderedModules={orderedModules}
                        moduleUnlocks={moduleUnlocks}
                        unlockDraft={unlockDraft}
                        onOpenUnlockEditorAction={openUnlockEditor}
                        onCloseUnlockEditorAction={closeUnlockEditor}
                        onUpdateUnlockDraftAction={updateUnlockDraft}
                        onCreateUnlockAction={handleCreateUnlockClick}
                        canCreateUnlock={canCreateUnlock}
                        isCreatingUnlock={createPaidService.mutation.isPending}
                        onUnlockAction={handleUnlockAction}
                        isUpdatingUnlocks={updatePaidService.mutation.isPending}
                    />
                )}

                {/* Danger tab */}
                <PlanEditorDangerTab
                    editorId={editorId}
                    activeTab={tab}
                    isDeleting={deletePlan.mutation.isPending}
                    onDeleteOpenAction={handleDeleteOpenClick}
                />
            </form>

            {/* Footer */}
            <PlanEditorFooter footerSlot={footerSlot} formId={`${editorId}-form`} canSave={canSave} isSaving={isSaving} changeCount={changeCount} />

            {/* Error */}
            {error && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

            {/* Confirmations */}
            <ConfirmActionModal
                open={makeDefaultOpen}
                onCloseAction={handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { plan: editorPlan.name })}
                body={t('plans.makeDefaultConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.makeDefault')}
                isConfirming={updatePlan.mutation.isPending}
                onConfirmAction={handleMakeDefaultConfirm}
                tone="default"
            />

            <ConfirmActionModal
                open={Boolean(pendingSave)}
                onCloseAction={handleSaveClose}
                title={t('plans.saveConfirmTitle', { plan: editorPlan.name })}
                body={<PlanSaveSummary pendingSave={pendingSave} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={isSaving}
                onConfirmAction={handleSaveConfirm}
                tone="default"
                size="md"
            />

            <ConfirmActionModal
                open={deleteOpen}
                onCloseAction={handleDeleteClose}
                title={t('plans.deleteConfirmTitle', { plan: editorPlan.name })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={deletePlan.mutation.isPending}
                onConfirmAction={handleDeleteConfirm}
            />
        </article>
    );
}
