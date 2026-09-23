'use client';

import { useTranslations } from 'next-intl';

import { PlanModuleConfigPopover } from '@/components/admin/plans/PlanModuleConfigPopover';
import { PlanModuleGridRow } from '@/components/admin/plans/PlanModuleGridRow';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { PLAN_MODULE_GRID_ID } from '@/hooks/useEventTypePlansPane';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanModuleGrid } from '@/hooks/usePlanModuleGrid';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanModuleGrid({
    eventType,
    plans,
    modules,
    unlocks,
}: {
    eventType: PlatformEventTypeResponseDto;
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    unlocks: PaidServiceResponseDto[];
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const moduleLabel = useLocalizedModuleLabel(modules);
    const moduleName = (moduleKey: string) => moduleLabel(moduleKey).name;
    const grid = usePlanModuleGrid({ eventTypeKey: eventType.eventTypeKey, plans, modules, unlocks, moduleName });
    const eventTypeName = localizedText(eventType.name, eventType.eventTypeKey);
    const pending = grid.applicability.pending;

    return (
        <section id={PLAN_MODULE_GRID_ID} className="scroll-mt-20">
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-semibold text-ink">{t('plans.grid.title')}</h3>
                    <p className="text-xs font-semibold text-ink-faint">
                        {t('plans.grid.count', { supported: grid.grid.supportedCount, unsupported: grid.grid.unsupportedCount })}
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-muted">
                    <input type="checkbox" checked={grid.showHidden} onChange={grid.toggleShowHidden} className="h-3.5 w-3.5 accent-primary" />
                    {t('plans.grid.showHidden')}
                </label>
            </div>

            {/* Grid */}
            <div className="rounded-xl border border-border bg-card">
                {grid.isLoading && <LoadingState label={t('plans.loading')} className="justify-start px-4 py-6" />}
                {grid.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(grid.error)}`)}</p>}
                {!grid.isLoading && !grid.error && grid.grid.columns.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('plans.grid.noPlans')}</p>
                )}
                {!grid.isLoading && !grid.error && grid.grid.columns.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="sticky left-0 z-10 bg-card px-3 py-2 font-bold">{t('plans.grid.title')}</th>
                                    {grid.grid.columns.map(({ plan }) => (
                                        <th key={plan.id} className={cn('min-w-40 px-2.5 py-2 font-bold', !plan.isPublic && 'text-ink-faint/70')}>
                                            <span className="block truncate text-ink normal-case">{plan.name}</span>
                                            <span className="font-mono text-[10px] font-semibold text-ink-faint normal-case">{plan.code}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {grid.grid.rows.map((row) => (
                                    <PlanModuleGridRow
                                        key={row.moduleKey}
                                        row={row}
                                        moduleName={moduleName(row.moduleKey)}
                                        failedPlanIds={grid.failedPlanIds}
                                        onRequestApplicabilityAction={grid.requestApplicability}
                                        onCellClickAction={grid.handleCellClick}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Cell editor */}
            {grid.openCell && grid.openCellPlan && (
                <PlanModuleConfigPopover
                    key={`${grid.openCell.cell.planId}:${grid.openCell.cell.moduleKey}`}
                    cell={grid.openCell.cell}
                    plan={grid.openCellPlan}
                    moduleName={moduleName(grid.openCell.cell.moduleKey)}
                    anchor={grid.openCell.anchor}
                    onCloseAction={grid.closeCell}
                />
            )}

            {/* Applicability confirmation */}
            <ConfirmActionModal
                open={Boolean(pending)}
                onCloseAction={grid.applicability.cancel}
                title={pending ? t('plans.grid.applicability.confirmTitle', { module: pending.moduleName, eventType: eventTypeName }) : ''}
                body={
                    pending && (
                        <>
                            <p className="font-mono text-sm">
                                {t('plans.grid.applicability.confirmBody', {
                                    before: t(`plans.grid.applicability.${pending.before}`),
                                    after: t(`plans.grid.applicability.${pending.after}`),
                                })}
                            </p>
                            {pending.after === 'UNSUPPORTED' && (
                                <p className="mt-2 text-sm text-status-danger">{t('plans.grid.applicability.unsupportedWarning')}</p>
                            )}
                            {grid.applicability.error && (
                                <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(grid.applicability.error)}`)}</p>
                            )}
                        </>
                    )
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.grid.applicability.confirm')}
                isConfirming={grid.applicability.isSaving}
                onConfirmAction={grid.applicability.confirm}
                tone={pending?.after === 'UNSUPPORTED' ? 'danger' : 'default'}
            />
        </section>
    );
}
