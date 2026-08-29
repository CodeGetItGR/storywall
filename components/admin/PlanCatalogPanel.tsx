'use client';

import { useList } from '@refinedev/core';
import { CopyPlus, Pencil, Plus, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { adminInputClass } from '@/components/admin/AdminField';
import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminPaidServices, useAdminPlatformEventTypes, useAdminPlatformModules } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanScope, PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: Array<Visibility | 'ALL'> = ['ALL', 'LIVE', 'HIDDEN', 'ARCHIVED'];

const STATUS_DOT: Record<Visibility, string> = {
    LIVE: 'bg-status-good',
    HIDDEN: 'bg-status-warn',
    ARCHIVED: 'bg-status-neutral',
};
const STATUS_PILL: Record<Visibility, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

export function PlanCatalogPanel({ scope }: { scope: PlanScope }) {
    const t = useTranslations('AdminPage.plans');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();

    const [statusFilter, setStatusFilter] = useState<Visibility | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [duplicatePlanId, setDuplicatePlanId] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    // A single unfiltered-by-status fetch backs the stat tiles and the table alike;
    // status/search stay client-side so switching filters never re-hits the network.
    const { result: plansResult, query: plansQuery } = useList<PlanTierResponseDto>({
        resource: 'plan-tiers',
        dataProviderName: 'plan-tiers',
        filters: [
            { field: 'scope', operator: 'eq', value: scope },
            { field: 'includeArchived', operator: 'eq', value: true },
        ],
        pagination: { mode: 'off' },
    });
    const modulesQuery = useAdminPlatformModules();
    const eventTypesQuery = useAdminPlatformEventTypes();
    const paidServicesQuery = useAdminPaidServices('MODULE_UNLOCK', true);
    const accountPlansDisabled = scope === 'ACCOUNT';

    const allPlans = useMemo(() => [...plansResult.data].sort((left, right) => left.sortOrder - right.sortOrder), [plansResult.data]);
    const selectedPlan = useMemo(() => allPlans.find((plan) => plan.id === selectedPlanId) ?? null, [allPlans, selectedPlanId]);
    const duplicatePlan = useMemo(() => allPlans.find((plan) => plan.id === duplicatePlanId) ?? null, [allPlans, duplicatePlanId]);

    const stats = useMemo(() => {
        let live = 0;
        let hidden = 0;
        let archived = 0;
        for (const plan of allPlans) {
            const status = visibilityOf(plan);
            if (status === 'LIVE') live += 1;
            else if (status === 'HIDDEN') hidden += 1;
            else archived += 1;
        }
        return { total: allPlans.length, live, hidden, archived };
    }, [allPlans]);

    const visiblePlans = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return allPlans.filter((plan) => {
            if (statusFilter !== 'ALL' && visibilityOf(plan) !== statusFilter) return false;
            if (!needle) return true;
            return plan.name.toLowerCase().includes(needle) || plan.code.toLowerCase().includes(needle);
        });
    }, [allPlans, statusFilter, search]);

    const handleStatusFilterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusFilter(event.currentTarget.dataset.status as Visibility | 'ALL');
    }, []);
    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), []);

    const openCreate = useCallback(() => {
        setDuplicatePlanId(null);
        setCreateOpen(true);
    }, []);
    const closeCreate = useCallback(() => {
        setCreateOpen(false);
        setDuplicatePlanId(null);
    }, []);

    const handleDuplicateClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        const planId = event.currentTarget.dataset.planId;
        if (!planId) return;
        setDuplicatePlanId(planId);
        setCreateOpen(true);
    }, []);

    const openEdit = useCallback((planId: string) => setSelectedPlanId(planId), []);
    const handleEditClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const planId = event.currentTarget.dataset.planId;
            if (planId) openEdit(planId);
        },
        [openEdit]
    );
    const closeEditor = useCallback(() => setSelectedPlanId(null), []);

    const handleCreated = useCallback(
        (name: string) => {
            setCreateOpen(false);
            setDuplicatePlanId(null);
            setSavedMessage(t('create.createSuccess', { plan: name }));
        },
        [t]
    );
    const handleSaved = useCallback(
        (name: string) => {
            setSelectedPlanId(null);
            setSavedMessage(t('saveSuccess', { plan: name }));
        },
        [t]
    );

    // The banner is catalog-level state so it survives the drawer it was raised from closing.
    useEffect(() => {
        if (!savedMessage) return;
        const timeoutId = setTimeout(() => setSavedMessage(null), 4000);
        return () => clearTimeout(timeoutId);
    }, [savedMessage]);

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t(`panel.${scope}.eyebrow`)}</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t(`panel.${scope}.title`)}</h2>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">{t(`panel.${scope}.subtitle`)}</p>
                </div>
                {!accountPlansDisabled && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:-translate-y-0.5 hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                        <Plus className="h-4 w-4" />
                        {t('create.open')}
                    </button>
                )}
            </div>

            {accountPlansDisabled && (
                <div className="rounded-lg border border-status-warn-wash bg-status-warn-wash/40 px-4 py-3 text-sm font-medium leading-6 text-status-warn">
                    {t('accountDisabledNotice')}
                </div>
            )}

            {/* Save/create confirmation */}
            {savedMessage && (
                <p role="status" className="rounded-lg bg-status-good-wash px-4 py-2.5 text-sm font-semibold text-status-good">
                    {savedMessage}
                </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminStatTile label={t('stats.total')} value={stats.total} />
                <AdminStatTile label={t('stats.live')} value={stats.live} accent="text-status-good" />
                <AdminStatTile label={t('stats.hidden')} value={stats.hidden} accent="text-status-warn" />
                <AdminStatTile label={t('stats.archived')} value={stats.archived} accent="text-status-neutral" />
            </div>

            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('search.placeholder')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={handleStatusFilterClick}
                                aria-pressed={statusFilter === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    statusFilter === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                                )}
                            >
                                {status === 'ALL' ? t('status.ALL') : t(`status.${status}`)}
                            </button>
                        ))}
                    </div>
                    <p className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">
                        {t('rowCount', { shown: visiblePlans.length, total: allPlans.length })}
                    </p>
                </div>

                {plansQuery.isLoading && <LoadingState label={t('loading')} className="justify-start px-4 py-6" />}
                {plansQuery.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(plansQuery.error)}`)}</p>}
                {!plansQuery.isLoading && !plansQuery.error && visiblePlans.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-muted">{t('empty')}</p>
                )}

                {!plansQuery.isLoading && !plansQuery.error && visiblePlans.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-[13px]">
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                                    <th className="px-3 py-2 font-bold">{t('columns.plan')}</th>
                                    {scope === 'EVENT' && <th className="px-2.5 py-2 font-bold">{t('columns.eventTypes')}</th>}
                                    <th className="px-2.5 py-2 font-bold">{t('columns.price')}</th>
                                    <th className="px-2.5 py-2 font-bold">{t('columns.limits')}</th>
                                    {scope === 'EVENT' && <th className="px-2.5 py-2 font-bold">{t('columns.modules')}</th>}
                                    <th className="px-2.5 py-2 font-bold">{t('columns.status')}</th>
                                    <th className="px-2.5 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePlans.map((plan) => {
                                    const status = visibilityOf(plan);
                                    const limits =
                                        plan.scope === 'EVENT'
                                            ? [
                                                  formatLimitValue(plan.maxMembers, 'count') ?? tAdmin('unlimited'),
                                                  formatLimitValue(plan.storageBytes, 'bytes') ?? tAdmin('unlimited'),
                                              ].join(' · ')
                                            : t('noQuotas');
                                    const eventTypeNames = plan.eventTypeKeys
                                        .map((key) => eventTypesQuery.data?.find((eventType) => eventType.eventTypeKey === key))
                                        .filter((eventType): eventType is PlatformEventTypeResponseDto => Boolean(eventType));
                                    return (
                                        <tr key={plan.id} className="border-b border-border last:border-b-0 hover:bg-canvas/60">
                                            <td className="max-w-64 px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-semibold text-ink">{plan.name}</p>
                                                    {plan.isDefault && (
                                                        <span className="shrink-0 rounded-full bg-primary-light px-1.5 py-0.5 text-[9.5px] font-bold text-primary-dark">
                                                            {t('default')}
                                                        </span>
                                                    )}
                                                </div>
                                                {plan.description && <p className="truncate text-[11px] text-ink-faint">{plan.description}</p>}
                                            </td>
                                            {scope === 'EVENT' && (
                                                <td className="max-w-48 px-2.5 py-2">
                                                    {eventTypeNames.length === 0 ? (
                                                        <span className="text-xs font-semibold text-ink-faint">{t('eventTypes.allBadge')}</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {eventTypeNames.slice(0, 2).map((eventType) => (
                                                                <span
                                                                    key={eventType.id}
                                                                    className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 text-[9.5px] font-bold text-status-neutral"
                                                                >
                                                                    {resolveLocalizedText(eventType.name, locale, eventType.eventTypeKey)}
                                                                </span>
                                                            ))}
                                                            {eventTypeNames.length > 2 && (
                                                                <span className="rounded-full bg-status-neutral-wash px-1.5 py-0.5 text-[9.5px] font-bold text-status-neutral">
                                                                    +{eventTypeNames.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-2.5 py-2 font-mono text-ink">{formatPlanMoney(plan, locale) ?? t('noPrice')}</td>
                                            <td className="px-2.5 py-2 text-ink-muted">{limits}</td>
                                            {scope === 'EVENT' && (
                                                <td className="max-w-48 px-2.5 py-2">
                                                    <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modulesQuery.data ?? []} />
                                                </td>
                                            )}
                                            <td className="px-2.5 py-2">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                                        STATUS_PILL[status]
                                                    )}
                                                >
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                                                    {t(`status.${status}`)}
                                                </span>
                                            </td>
                                            <td className="px-2.5 py-2 text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {scope === 'EVENT' && (
                                                        <button
                                                            type="button"
                                                            data-plan-id={plan.id}
                                                            onClick={handleDuplicateClick}
                                                            aria-label={t('duplicate.action', { plan: plan.name })}
                                                            title={t('duplicate.label')}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                                        >
                                                            <CopyPlus className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        data-plan-id={plan.id}
                                                        onClick={handleEditClick}
                                                        aria-label={t('edit')}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {!accountPlansDisabled && (
                <PlanCreateForm
                    key={duplicatePlan?.id ?? 'new-plan'}
                    open={createOpen}
                    onCloseAction={closeCreate}
                    onCreatedAction={handleCreated}
                    plans={allPlans}
                    eventTypes={eventTypesQuery.data ?? []}
                    modules={modulesQuery.data ?? []}
                    scope={scope}
                    sourcePlan={duplicatePlan}
                />
            )}

            <AdminDrawer
                open={Boolean(selectedPlan)}
                onClose={closeEditor}
                closeLabel={tAdmin('cancel')}
                title={selectedPlan?.name ?? ''}
                subtitle={selectedPlan?.code}
            >
                {selectedPlan && (
                    <PlanEditorCard
                        key={`${selectedPlan.id}:${selectedPlan.moduleKeys.join(',')}:${selectedPlan.eventTypeKeys.join(',')}`}
                        plan={selectedPlan}
                        modules={modulesQuery.data ?? []}
                        paidServices={paidServicesQuery.data ?? []}
                        eventPlans={allPlans}
                        scope={scope}
                        onSavedAction={handleSaved}
                    />
                )}
            </AdminDrawer>
        </section>
    );
}
