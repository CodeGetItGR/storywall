'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useMemo, useState } from 'react';

import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { useAdminPlanTiers, useAdminPlatformModules } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanScope } from '@/lib/api/types';

export function PlanCatalogPanel({ scope }: { scope: PlanScope }) {
    const t = useTranslations('AdminPage');
    const [includeArchived, setIncludeArchived] = useState(true);
    const plansQuery = useAdminPlanTiers(scope, includeArchived);
    const modulesQuery = useAdminPlatformModules();
    const plans = useMemo(() => [...(plansQuery.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder), [plansQuery.data]);

    function handleIncludeArchivedChange(event: ChangeEvent<HTMLInputElement>) {
        setIncludeArchived(event.target.checked);
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{t(`plans.panel.${scope}.eyebrow`)}</p>
                    <h2 className="mt-1 text-lg font-semibold text-ink">{t(`plans.panel.${scope}.title`)}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t(`plans.panel.${scope}.subtitle`)}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
                    <input type="checkbox" checked={includeArchived} onChange={handleIncludeArchivedChange} className="h-4 w-4 accent-primary" />
                    {t('plans.filters.includeArchived')}
                </label>
            </div>

            <PlanCreateForm plans={plans} scope={scope} />

            {plansQuery.isLoading && <p className="text-sm text-ink-muted">{t('plans.loading')}</p>}
            {plansQuery.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(plansQuery.error)}`)}</p>}
            <div className="grid gap-3">
                {plans.map((plan) => (
                    <PlanEditorCard key={`${plan.id}:${plan.moduleKeys.join(',')}`} plan={plan} modules={modulesQuery.data ?? []} />
                ))}
            </div>
        </section>
    );
}
