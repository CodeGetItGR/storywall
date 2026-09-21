'use client';

import { useTranslations } from 'next-intl';

import { PlanEditorAddonsSection } from '@/components/admin/PlanEditorAddonsSection';
import { PlanEditorAnchors } from '@/components/admin/PlanEditorAnchors';
import { PlanEditorAvailabilitySection } from '@/components/admin/PlanEditorAvailabilitySection';
import { PlanEditorDangerSection } from '@/components/admin/PlanEditorDangerSection';
import { PlanEditorDetailsSection } from '@/components/admin/PlanEditorDetailsSection';
import { PlanEditorFooter } from '@/components/admin/PlanEditorFooter';
import { PlanEditorHeader } from '@/components/admin/PlanEditorHeader';
import { PlanEditorLimitsSection } from '@/components/admin/PlanEditorLimitsSection';
import { PlanEditorModulesSummary } from '@/components/admin/PlanEditorModulesSummary';
import { PlanEditorPricingSection } from '@/components/admin/PlanEditorPricingSection';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePlanEditorCard, type UsePlanEditorCardArgs } from '@/hooks/usePlanEditorCard';
import { adminErrorMessageKey } from '@/lib/adminUtils';

function noop() {}

export function PlanEditorCard(props: UsePlanEditorCardArgs) {
    const t = useTranslations('AdminPage');
    const { plan } = props;
    const { formRef, ...editor } = usePlanEditorCard(props);
    const { editorId } = editor;

    return (
        <article className="min-w-0">
            {/* Header */}
            <PlanEditorHeader plan={plan} />

            {/* Anchors */}
            <PlanEditorAnchors anchors={editor.anchors} active={editor.activeAnchor} />

            {/* Form */}
            <form ref={formRef} id={`${editorId}-form`} onSubmit={editor.handleSubmit} onChange={editor.handleFormChange}>
                <PlanEditorDetailsSection
                    id={`${editorId}-details`}
                    plan={plan}
                    eventTypes={editor.orderedEventTypes}
                    siblings={editor.siblings}
                    onOpenSiblingAction={editor.onOpenSiblingAction}
                />
                <PlanEditorAvailabilitySection
                    id={`${editorId}-availability`}
                    plan={plan}
                    visibility={editor.visibility}
                    isMakingDefault={editor.updatePlan.mutation.isPending}
                    onVisibilityChangeAction={editor.handleVisibilityChange}
                    onMakeDefaultAction={editor.handleMakeDefaultClick}
                />
                <PlanEditorLimitsSection id={`${editorId}-limits`} plan={plan} />
                <PlanEditorPricingSection id={`${editorId}-pricing`} plan={plan} />
                <PlanEditorModulesSummary
                    id={`${editorId}-modules`}
                    included={plan.moduleKeys.length}
                    total={editor.orderedModules.length}
                    onOpenGridAction={editor.onOpenGridAction ?? noop}
                />
                <PlanEditorAddonsSection
                    id={`${editorId}-addons`}
                    plan={plan}
                    orderedModules={editor.orderedModules}
                    moduleUnlocks={editor.moduleUnlocks}
                    unlockDraft={editor.unlockDraft}
                    onOpenUnlockEditorAction={editor.openUnlockEditor}
                    onCloseUnlockEditorAction={editor.closeUnlockEditor}
                    onUpdateUnlockDraftAction={editor.updateUnlockDraft}
                    onCreateUnlockAction={editor.handleCreateUnlockClick}
                    canCreateUnlock={editor.canCreateUnlock}
                    isCreatingUnlock={editor.createPaidService.mutation.isPending}
                    onUnlockAction={editor.handleUnlockAction}
                    isUpdatingUnlocks={editor.updatePaidService.mutation.isPending}
                />
                <PlanEditorDangerSection id={`${editorId}-danger`} isDeleting={editor.deletePlan.mutation.isPending} onDeleteOpenAction={editor.handleDeleteOpenClick} />
            </form>

            {/* Footer */}
            <PlanEditorFooter footerSlot={editor.footerSlot} formId={`${editorId}-form`} canSave={editor.canSave} isSaving={editor.isSaving} changeCount={editor.changeCount} />

            {/* Error */}
            {editor.error && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(editor.error)}`)}</p>}

            {/* Confirmations */}
            <ConfirmActionModal
                open={editor.makeDefaultOpen}
                onCloseAction={editor.handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { plan: plan.name })}
                body={t('plans.makeDefaultConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.makeDefault')}
                isConfirming={editor.updatePlan.mutation.isPending}
                onConfirmAction={editor.handleMakeDefaultConfirm}
                tone="default"
            />
            <ConfirmActionModal
                open={Boolean(editor.pendingSave)}
                onCloseAction={editor.handleSaveClose}
                title={t('plans.saveConfirmTitle', { plan: plan.name })}
                body={<PlanSaveSummary pendingSave={editor.pendingSave} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={editor.isSaving}
                onConfirmAction={editor.handleSaveConfirm}
                tone="default"
                size="md"
            />
            <ConfirmActionModal
                open={editor.deleteOpen}
                onCloseAction={editor.handleDeleteClose}
                title={t('plans.deleteConfirmTitle', { plan: plan.name })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={editor.deletePlan.mutation.isPending}
                onConfirmAction={editor.handleDeleteConfirm}
            />
        </article>
    );
}
