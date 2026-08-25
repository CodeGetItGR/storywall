'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useState } from 'react';

import {
    PlanMatrixCheckbox,
    PlanMatrixMobileCard,
    PlanMatrixMobileRow,
    PlanMatrixPlanCell,
    PlanMatrixToolbar,
} from '@/components/admin/PlanMatrixParts';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanAvailability } from '@/hooks/usePlanAvailability';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { visibilityOf } from '@/lib/adminVisibility';

export function PlanAvailabilityPanel() {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const matrix = usePlanAvailability();
    const [confirmOpen, setConfirmOpen] = useState(false);

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        matrix.setSearch(event.target.value);
    }

    function handleAllClick(event: MouseEvent<HTMLButtonElement>) {
        const plan = matrix.plans.find((item) => item.id === event.currentTarget.dataset.planId);
        if (plan) matrix.setAll(plan);
    }

    function handleEventTypeClick(event: MouseEvent<HTMLButtonElement>) {
        const plan = matrix.plans.find((item) => item.id === event.currentTarget.dataset.planId);
        const eventType = matrix.eventTypes.find((item) => item.eventTypeKey === event.currentTarget.dataset.assignmentKey);
        if (plan && eventType) matrix.toggleEventType(plan, eventType.eventTypeKey);
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

    const loading = matrix.plansQuery.isLoading || matrix.eventTypesQuery.isLoading;
    const loadError = matrix.plansQuery.error ?? matrix.eventTypesQuery.error;

    return (
        <section className="space-y-4">
            {/* Header */}
            <PlanMatrixToolbar
                title={t('planAvailability.title')}
                subtitle={t('planAvailability.subtitle')}
                search={matrix.search}
                searchLabel={t('planAvailability.search')}
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

            {/* Assignment matrix */}
            <section className="overflow-hidden rounded-lg border border-border bg-card" aria-label={t('planAvailability.matrixLabel')}>
                {loading && <p className="px-4 py-5 text-sm text-ink-muted">{t('planAvailability.loading')}</p>}
                {loadError && <p className="px-4 py-5 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(loadError)}`)}</p>}
                {!loading && !loadError && matrix.plans.length === 0 && (
                    <p className="px-4 py-5 text-sm text-ink-muted">{t('planAvailability.empty')}</p>
                )}
                {!loading && !loadError && matrix.plans.length > 0 && (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-3 p-3 md:hidden">
                            {matrix.plans.map((plan) => {
                                const eventTypeKeys = matrix.eventTypeKeysFor(plan);
                                const unrestricted = eventTypeKeys.length === 0;
                                return (
                                    <PlanMatrixMobileCard key={plan.id} plan={plan} statusLabel={t(`plans.status.${visibilityOf(plan)}`)}>
                                        <PlanMatrixMobileRow
                                            title={t('planAvailability.allTypes')}
                                            caption={t('planAvailability.allTypesFor', { plan: plan.name })}
                                            action={
                                                <PlanMatrixCheckbox
                                                    checked={unrestricted}
                                                    disabled={unrestricted || matrix.isApplying}
                                                    label={t('planAvailability.allTypesFor', { plan: plan.name })}
                                                    data-plan-id={plan.id}
                                                    onClickAction={handleAllClick}
                                                >
                                                    {unrestricted ? t('planAvailability.all') : t('planAvailability.useAll')}
                                                </PlanMatrixCheckbox>
                                            }
                                        />
                                        {matrix.eventTypes.map((eventType) => {
                                            const included = unrestricted || eventTypeKeys.includes(eventType.eventTypeKey);
                                            const lastSelected = !unrestricted && included && eventTypeKeys.length === 1;
                                            return (
                                                <PlanMatrixMobileRow
                                                    key={eventType.eventTypeKey}
                                                    title={localizedText(eventType.name)}
                                                    caption={!eventType.isEnabled ? t('eventTypes.disabled') : undefined}
                                                    action={
                                                        <PlanMatrixCheckbox
                                                            checked={included}
                                                            disabled={(!eventType.isEnabled && !included) || lastSelected || matrix.isApplying}
                                                            label={t('planAvailability.assignmentLabel', {
                                                                plan: plan.name,
                                                                eventType: localizedText(eventType.name),
                                                            })}
                                                            data-plan-id={plan.id}
                                                            data-assignment-key={eventType.eventTypeKey}
                                                            onClickAction={handleEventTypeClick}
                                                        />
                                                    }
                                                />
                                            );
                                        })}
                                    </PlanMatrixMobileCard>
                                );
                            })}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-max border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                                        <th className="sticky left-0 z-10 min-w-48 bg-card px-3 py-2 text-left">{t('fields.plan')}</th>
                                        <th className="min-w-20 px-2 py-2 text-center">{t('planAvailability.allTypes')}</th>
                                        {matrix.eventTypes.map((eventType) => (
                                            <th key={eventType.eventTypeKey} className="min-w-24 max-w-32 px-2 py-2 text-center">
                                                <span className="block normal-case tracking-normal text-ink-muted">{localizedText(eventType.name)}</span>
                                                {!eventType.isEnabled && (
                                                    <span className="block text-[9px] text-status-neutral">{t('eventTypes.disabled')}</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrix.plans.map((plan) => {
                                        const eventTypeKeys = matrix.eventTypeKeysFor(plan);
                                        const unrestricted = eventTypeKeys.length === 0;
                                        return (
                                            <tr key={plan.id} className="border-b border-border last:border-b-0 hover:bg-canvas/50">
                                                <PlanMatrixPlanCell plan={plan} statusLabel={t(`plans.status.${visibilityOf(plan)}`)} />
                                                <td className="px-2 py-2 text-center">
                                                    <PlanMatrixCheckbox
                                                        checked={unrestricted}
                                                        disabled={unrestricted || matrix.isApplying}
                                                        label={t('planAvailability.allTypesFor', { plan: plan.name })}
                                                        data-plan-id={plan.id}
                                                        onClickAction={handleAllClick}
                                                    >
                                                        {unrestricted ? t('planAvailability.all') : t('planAvailability.useAll')}
                                                    </PlanMatrixCheckbox>
                                                </td>
                                                {matrix.eventTypes.map((eventType) => {
                                                    const included = unrestricted || eventTypeKeys.includes(eventType.eventTypeKey);
                                                    const lastSelected = !unrestricted && included && eventTypeKeys.length === 1;
                                                    return (
                                                        <td key={eventType.eventTypeKey} className="px-2 py-2 text-center">
                                                            <PlanMatrixCheckbox
                                                                checked={included}
                                                                disabled={(!eventType.isEnabled && !included) || lastSelected || matrix.isApplying}
                                                                label={t('planAvailability.assignmentLabel', {
                                                                    plan: plan.name,
                                                                    eventType: localizedText(eventType.name),
                                                                })}
                                                                data-plan-id={plan.id}
                                                                data-assignment-key={eventType.eventTypeKey}
                                                                onClickAction={handleEventTypeClick}
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
                    </>
                )}
            </section>

            {/* Confirmation */}
            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={closeConfirmation}
                title={t('planAvailability.confirmTitle')}
                body={t('planAvailability.confirmBody', { count: matrix.pendingPlanCount })}
                cancelLabel={t('cancel')}
                confirmLabel={t('planMatrices.apply')}
                isConfirming={matrix.isApplying}
                onConfirmAction={confirmChanges}
                tone="default"
            />
        </section>
    );
}
