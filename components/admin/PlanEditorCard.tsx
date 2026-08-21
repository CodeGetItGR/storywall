'use client';

import { useTranslations } from 'next-intl';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { PlanEditorDangerTab } from '@/components/admin/PlanEditorDangerTab';
import { PlanEditorDetailsTab } from '@/components/admin/PlanEditorDetailsTab';
import { PlanEditorEventTypesTab } from '@/components/admin/PlanEditorEventTypesTab';
import { PlanEditorFooter } from '@/components/admin/PlanEditorFooter';
import { PlanEditorHeader } from '@/components/admin/PlanEditorHeader';
import { PlanEditorLimitsTab } from '@/components/admin/PlanEditorLimitsTab';
import { PlanEditorModulesTab } from '@/components/admin/PlanEditorModulesTab';
import { PlanEditorPricingTab } from '@/components/admin/PlanEditorPricingTab';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePlanEditorCard } from '@/hooks/usePlanEditorCard';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanEditorCard({
    plan,
    modules,
    eventTypes,
    paidServices,
    eventPlans,
    scope,
}: {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
}) {
    const t = useTranslations('AdminPage');
    const {
        plan: editorPlan,
        isEvent,
        tabs,
        tab,
        setTab,
        visibility,
        moduleKeys,
        eventTypeKeys,
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
        handleModuleChange,
        handleEventTypeChange,
        openUnlockEditor,
        closeUnlockEditor,
        updateUnlockDraft,
        handleCreateUnlockClick,
        canCreateUnlock,
        orderedModules,
        orderedEventTypes,
        moduleUnlocks,
        handleUnlockAction,
    } = usePlanEditorCard({ plan, modules, eventTypes, paidServices, eventPlans, scope });

    return (
        <article className={cn('min-w-0', plan.isAssignable ? '' : 'opacity-90')}>
            {/* Header */}
            <PlanEditorHeader
                plan={editorPlan}
                isEvent={isEvent}
                isMakingDefault={updatePlan.mutation.isPending}
                onMakeDefault={handleMakeDefaultClick}
            />

            {/* Form */}
            <form ref={formRef} id={`${editorId}-form`} onSubmit={handleSubmit} onChange={handleFormChange}>
                {/* Tabs */}
                <AdminTabs id={editorId} tabs={tabs} active={tab} onSelect={setTab} className="mt-4" />

                {/* Details tab */}
                <PlanEditorDetailsTab
                    editorId={editorId}
                    activeTab={tab}
                    plan={editorPlan}
                    visibility={visibility}
                    onVisibilityChange={handleVisibilityChange}
                />

                {/* Limits tab */}
                <PlanEditorLimitsTab editorId={editorId} activeTab={tab} plan={editorPlan} isEvent={isEvent} />

                {/* Pricing tab */}
                <PlanEditorPricingTab editorId={editorId} activeTab={tab} plan={editorPlan} isEvent={isEvent} />

                {/* Modules tab */}
                {isEvent && (
                    <PlanEditorModulesTab
                        editorId={editorId}
                        activeTab={tab}
                        plan={editorPlan}
                        orderedModules={orderedModules}
                        moduleUnlocks={moduleUnlocks}
                        moduleKeys={moduleKeys}
                        unlockDraft={unlockDraft}
                        onModuleChange={handleModuleChange}
                        onOpenUnlockEditor={openUnlockEditor}
                        onCloseUnlockEditor={closeUnlockEditor}
                        onUpdateUnlockDraft={updateUnlockDraft}
                        onCreateUnlock={handleCreateUnlockClick}
                        canCreateUnlock={canCreateUnlock}
                        isCreatingUnlock={createPaidService.mutation.isPending}
                        onUnlockAction={handleUnlockAction}
                        isUpdatingUnlocks={updatePaidService.mutation.isPending}
                    />
                )}

                {/* Event types tab */}
                {isEvent && (
                    <PlanEditorEventTypesTab
                        editorId={editorId}
                        activeTab={tab}
                        orderedEventTypes={orderedEventTypes}
                        eventTypeKeys={eventTypeKeys}
                        onEventTypeChange={handleEventTypeChange}
                    />
                )}

                {/* Danger tab */}
                <PlanEditorDangerTab
                    editorId={editorId}
                    activeTab={tab}
                    isDeleting={deletePlan.mutation.isPending}
                    onDeleteOpen={handleDeleteOpenClick}
                />
            </form>

            {/* Footer */}
            <PlanEditorFooter footerSlot={footerSlot} formId={`${editorId}-form`} canSave={canSave} isSaving={isSaving} changeCount={changeCount} />

            {/* Error */}
            {error && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

            {/* Confirmations */}
            <ConfirmActionModal
                open={makeDefaultOpen}
                onClose={handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { plan: editorPlan.name })}
                body={t('plans.makeDefaultConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.makeDefault')}
                isConfirming={updatePlan.mutation.isPending}
                onConfirm={handleMakeDefaultConfirm}
                tone="default"
            />

            <ConfirmActionModal
                open={Boolean(pendingSave)}
                onClose={handleSaveClose}
                title={t('plans.saveConfirmTitle', { plan: editorPlan.name })}
                body={<PlanSaveSummary pendingSave={pendingSave} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={isSaving}
                onConfirm={handleSaveConfirm}
                tone="default"
                size="md"
            />

            <ConfirmActionModal
                open={deleteOpen}
                onClose={handleDeleteClose}
                title={t('plans.deleteConfirmTitle', { plan: editorPlan.name })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={deletePlan.mutation.isPending}
                onConfirm={handleDeleteConfirm}
            />
        </article>
    );
}
