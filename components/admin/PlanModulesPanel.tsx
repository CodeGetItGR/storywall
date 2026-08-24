'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useState } from 'react';

import { PlanMatrixCheckbox, PlanMatrixPlanCell, PlanMatrixToolbar } from '@/components/admin/PlanMatrixParts';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePlanModules } from '@/hooks/usePlanModules';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { visibilityOf } from '@/lib/adminVisibility';

export function PlanModulesPanel() {
    const t = useTranslations('AdminPage');
    const matrix = usePlanModules();
    const [confirmOpen, setConfirmOpen] = useState(false);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        matrix.setSearch(event.target.value);
    }

    function handleClearClick(event: MouseEvent<HTMLButtonElement>) {
        const plan = matrix.plans.find((item) => item.id === event.currentTarget.dataset.planId);
        if (plan) matrix.clearModules(plan);
    }

    function handleModuleClick(event: MouseEvent<HTMLButtonElement>) {
        const plan = matrix.plans.find((item) => item.id === event.currentTarget.dataset.planId);
        const moduleItem = matrix.modules.find((item) => item.moduleKey === event.currentTarget.dataset.assignmentKey);
        if (plan && moduleItem) matrix.toggleModule(plan, moduleItem.moduleKey);
    }

    function openConfirmation() {
        setConfirmOpen(true);
    }

    function closeConfirmation() {
        if (!matrix.isApplying) setConfirmOpen(false);
    }

    async function confirmChanges() {
        await matrix.applyChanges();
        setConfirmOpen(false);
    }

    const loading = matrix.plansQuery.isLoading || matrix.modulesQuery.isLoading;
    const loadError = matrix.plansQuery.error ?? matrix.modulesQuery.error;

    return (
        <section className="space-y-4">
            {/* Header */}
            <PlanMatrixToolbar
                title={t('planModules.title')}
                subtitle={t('planModules.subtitle')}
                search={matrix.search}
                searchLabel={t('planModules.search')}
                pendingCount={matrix.pendingPlanCount}
                discardLabel={t('planMatrices.discard')}
                reviewLabel={t('planMatrices.review', { count: matrix.pendingPlanCount })}
                onSearchChangeAction={handleSearchChange}
                onDiscardAction={matrix.discardChanges}
                onReviewAction={openConfirmation}
            />

            {matrix.mutationError && (
                <p role="alert" className="rounded-lg bg-status-danger-wash px-4 py-2.5 text-sm font-semibold text-status-danger">
                    {t(`errors.${adminErrorMessageKey(matrix.mutationError)}`)}
                </p>
            )}

            {/* Module matrix */}
            <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label={t('planModules.matrixLabel')}>
                {loading && <p className="px-4 py-5 text-sm text-ink-muted">{t('planModules.loading')}</p>}
                {loadError && <p className="px-4 py-5 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(loadError)}`)}</p>}
                {!loading && !loadError && matrix.plans.length === 0 && <p className="px-4 py-5 text-sm text-ink-muted">{t('planModules.empty')}</p>}
                {!loading && !loadError && matrix.plans.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="sticky left-0 z-10 min-w-48 bg-card px-3 py-2 text-left">{t('fields.plan')}</th>
                                    <th className="min-w-16 px-2 py-2 text-center">{t('planModules.clear')}</th>
                                    {matrix.modules.map((moduleItem) => (
                                        <th key={moduleItem.moduleKey} className="min-w-24 max-w-32 px-2 py-2 text-center">
                                            <span className="block normal-case tracking-normal text-ink-muted">{moduleItem.name}</span>
                                            {!moduleItem.isEnabled && (
                                                <span className="block text-[9px] text-status-neutral">{t('planModules.disabled')}</span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {matrix.plans.map((plan) => {
                                    const moduleKeys = matrix.moduleKeysFor(plan);
                                    return (
                                        <tr key={plan.id} className="border-b border-border last:border-b-0 hover:bg-canvas/50">
                                            <PlanMatrixPlanCell plan={plan} statusLabel={t(`plans.status.${visibilityOf(plan)}`)} />
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    type="button"
                                                    aria-label={t('planModules.clearFor', { plan: plan.name })}
                                                    data-plan-id={plan.id}
                                                    disabled={moduleKeys.length === 0 || matrix.isApplying}
                                                    onClick={handleClearClick}
                                                    className="mx-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-status-danger-wash hover:text-status-danger disabled:cursor-default disabled:opacity-30"
                                                >
                                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                                </button>
                                            </td>
                                            {matrix.modules.map((moduleItem) => {
                                                const included = moduleKeys.includes(moduleItem.moduleKey);
                                                return (
                                                    <td key={moduleItem.moduleKey} className="px-2 py-2 text-center">
                                                        <PlanMatrixCheckbox
                                                            checked={included}
                                                            disabled={(!moduleItem.isEnabled && !included) || matrix.isApplying}
                                                            label={t('planModules.assignmentLabel', { plan: plan.name, module: moduleItem.name })}
                                                            data-plan-id={plan.id}
                                                            data-assignment-key={moduleItem.moduleKey}
                                                            onClickAction={handleModuleClick}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Confirmation */}
            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={closeConfirmation}
                title={t('planModules.confirmTitle')}
                body={t('planModules.confirmBody', { count: matrix.pendingPlanCount })}
                cancelLabel={t('cancel')}
                confirmLabel={t('planMatrices.apply')}
                isConfirming={matrix.isApplying}
                onConfirmAction={confirmChanges}
                tone="default"
            />
        </section>
    );
}
