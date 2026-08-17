'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { PlanCatalogRow } from '@/components/admin/PlanCatalogRow';
import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { Modal } from '@/components/ui/modal';
import { useAdminPaidServices, useAdminPlanTiers, useAdminPlatformModules } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanScope } from '@/lib/api/types';

export function PlanCatalogPanel({ scope }: { scope: PlanScope }) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const [includeArchived, setIncludeArchived] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const plansQuery = useAdminPlanTiers(scope, includeArchived);
    const modulesQuery = useAdminPlatformModules();
    const paidServicesQuery = useAdminPaidServices('MODULE_UNLOCK', true);
    const accountPlansDisabled = scope === 'ACCOUNT';
    const plans = useMemo(() => [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [plansQuery.data]);
    const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);

    function handleIncludeArchivedChange(event: ChangeEvent<HTMLInputElement>) {
        setIncludeArchived(event.target.checked);
    }

    const handleOpenCreate = useCallback(() => {
        setCreateOpen(true);
    }, []);

    const handleCloseCreate = useCallback(() => {
        setCreateOpen(false);
    }, []);

    const handleOpenEditor = useCallback((planId: string) => {
        setSelectedPlanId(planId);
    }, []);

    const handleCloseEditor = useCallback(() => {
        setSelectedPlanId(null);
    }, []);

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t(`plans.panel.${scope}.eyebrow`)}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t(`plans.panel.${scope}.title`)}</h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">{t(`plans.panel.${scope}.subtitle`)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex min-h-10 items-center gap-2 border-b-2 border-border px-1 text-sm font-semibold text-ink-muted">
                        <input type="checkbox" checked={includeArchived} onChange={handleIncludeArchivedChange} className="h-4 w-4 accent-primary" />
                        <span>
                            {t('plans.filters.includeArchived')} <span className="text-ink-faint">({tCommon('optional')})</span>
                        </span>
                    </label>
                    {!accountPlansDisabled && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:-translate-y-0.5 hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                            <Plus className="h-4 w-4" />
                            {t('plans.create.open')}
                        </button>
                    )}
                </div>
            </div>

            {accountPlansDisabled && (
                <div className="border-b border-amber-200 bg-amber-50/70 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
                    {t('plans.accountDisabledNotice')}
                </div>
            )}

            {!accountPlansDisabled && <PlanCreateForm open={createOpen} onClose={handleCloseCreate} plans={plans} scope={scope} />}

            {plansQuery.isLoading && <p className="text-sm text-ink-muted">{t('plans.loading')}</p>}
            {plansQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(plansQuery.error)}`)}</p>}
            {!plansQuery.isLoading && !plansQuery.error && plans.length === 0 && <p className="py-4 text-sm text-ink-muted">{t('plans.empty')}</p>}
            {!plansQuery.isLoading && !plansQuery.error && (
                <div>
                    {plans.map((plan) => (
                        <PlanCatalogRow key={plan.id} plan={plan} modules={modulesQuery.data ?? []} onEdit={handleOpenEditor} />
                    ))}
                </div>
            )}

            <Modal open={Boolean(selectedPlan)} onClose={handleCloseEditor} size="lg" closeLabel={t('cancel')}>
                <Modal.Body className="px-4 pb-5 pt-12 sm:px-5">
                    {selectedPlan && (
                        <PlanEditorCard
                            key={`${selectedPlan.id}:${selectedPlan.moduleKeys.join(',')}`}
                            plan={selectedPlan}
                            modules={modulesQuery.data ?? []}
                            paidServices={paidServicesQuery.data ?? []}
                            eventPlans={plans}
                            scope={scope}
                        />
                    )}
                </Modal.Body>
            </Modal>
        </section>
    );
}
