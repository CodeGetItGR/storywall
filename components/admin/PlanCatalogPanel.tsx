'use client';

import { ChevronRight, Layers3, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { AdminSection } from '@/components/admin/AdminSection';
import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { useAdminPlanTiers, useAdminPlatformModules } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanScope } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';

export function PlanCatalogPanel({ scope }: { scope: PlanScope }) {
    const t = useTranslations('AdminPage');
    const [includeArchived, setIncludeArchived] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const plansQuery = useAdminPlanTiers(scope, includeArchived);
    const modulesQuery = useAdminPlatformModules();
    const plans = useMemo(() => [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [plansQuery.data]);
    const selectedPlan = useMemo(
        () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
        [plans, selectedPlanId]
    );

    function handleIncludeArchivedChange(event: ChangeEvent<HTMLInputElement>) {
        setIncludeArchived(event.target.checked);
    }

    const handleOpenCreate = useCallback(() => {
        setCreateOpen(true);
    }, []);

    const handleCloseCreate = useCallback(() => {
        setCreateOpen(false);
    }, []);

    const handleSelectPlan = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const nextPlanId = event.currentTarget.dataset.planId;
        if (!nextPlanId) return;
        setSelectedPlanId(nextPlanId);
    }, []);

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 sm:pb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t(`plans.panel.${scope}.eyebrow`)}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t(`plans.panel.${scope}.title`)}</h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">{t(`plans.panel.${scope}.subtitle`)}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-base font-medium text-ink-muted">
                    <input type="checkbox" checked={includeArchived} onChange={handleIncludeArchivedChange} className="h-4 w-4 accent-primary" />
                    {t('plans.filters.includeArchived')}
                </label>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-base font-semibold text-white transition hover:bg-ink/90"
                >
                    <Plus className="h-4 w-4" />
                    {t('plans.create.open')}
                </button>
            </div>

            <PlanCreateForm open={createOpen} onClose={handleCloseCreate} plans={plans} scope={scope} />

            {plansQuery.isLoading && <p className="text-sm text-ink-muted">{t('plans.loading')}</p>}
            {plansQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(plansQuery.error)}`)}</p>}
            {!plansQuery.isLoading && !plansQuery.error && (
                <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
                    <aside className="border-b border-border lg:border-b-0 lg:border-r lg:pr-5">
                        <div className="px-1 py-2 sm:px-0">
                            <div className="flex items-center gap-2">
                                <Layers3 className="h-4 w-4 text-primary-dark" />
                                <h3 className="text-base font-semibold text-ink">{t('plans.snapshotTitle')}</h3>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{t('plans.selectorHint')}</p>
                        </div>
                        <div className="max-h-[32rem] overflow-auto py-2 pr-1">
                            {plans.length === 0 ? (
                                <div className="border-b border-dashed border-border px-2 py-4 text-sm text-ink-muted">
                                    {t('plans.empty')}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {plans.map((plan) => {
                                        const selected = selectedPlan?.id === plan.id;
                                        const price = formatPlanMoney(plan) ?? t('plans.noPrice');
                                        const limit =
                                            plan.scope === 'EVENT'
                                                ? `${formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')} ${t('plans.members')}`
                                                : `${formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')} ${t('plans.activeEvents')}`;

                                        return (
                                            <button
                                                key={plan.id}
                                                type="button"
                                                data-plan-id={plan.id}
                                                onClick={handleSelectPlan}
                                                className={[
                                                    'w-full border-b px-2 py-3 text-left transition last:border-b-0',
                                                    selected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-transparent hover:bg-surface-muted',
                                                ].join(' ')}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-base font-semibold text-ink">{plan.code}</p>
                                                        <p className="truncate text-sm text-ink-muted">{plan.name}</p>
                                                    </div>
                                                    <ChevronRight className={selected ? 'mt-0.5 h-4 w-4 text-primary-dark' : 'mt-0.5 h-4 w-4 text-ink-faint'} />
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-muted">
                                                    <span className="rounded-full bg-surface-muted px-2 py-1">{price}</span>
                                                    <span className="rounded-full bg-surface-muted px-2 py-1">{limit}</span>
                                                    {!plan.isAssignable && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{t('plans.archived')}</span>}
                                                    {plan.isDefault && <span className="rounded-full bg-primary-light px-2 py-1 text-primary-dark">{t('plans.default')}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>

                    <div className="min-w-0">
                        {selectedPlan ? (
                            <PlanEditorCard key={`${selectedPlan.id}:${selectedPlan.moduleKeys.join(',')}`} plan={selectedPlan} modules={modulesQuery.data ?? []} scope={scope} />
                        ) : (
                            <AdminSection title={t('plans.emptyEditorTitle')} className="border-b border-border">
                                <p className="text-sm text-ink-muted">{t('plans.emptyEditorBody')}</p>
                            </AdminSection>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
