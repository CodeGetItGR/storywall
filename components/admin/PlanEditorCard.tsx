'use client';

import { useCreate, useCustomMutation, useDelete, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { type AdminTabDefinition, AdminTabPanel, AdminTabs } from '@/components/admin/AdminTabs';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { moduleChangeSummary, type PendingPlanSave, planChangeSummary, planPatchFromFormData, sameStringSet } from '@/lib/adminPlanEditor';
import { codeFromName, defaultCurrency, instantToLocalInput, priceInputToMinor, priceMinorToInput, STORAGE_UNITS, storageBytesToInput } from '@/lib/adminPlanForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import { endpoints } from '@/lib/api/endpoints';
import type { BillingPeriod, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'YEARLY', 'ONE_TIME'];

type UnlockDraft = {
    moduleKey: string;
    moduleName: string;
    name: string;
    description: string;
    price: string;
    priceCurrency: string;
};

export function PlanEditorCard({
    plan,
    modules,
    paidServices,
    eventPlans,
    scope,
}: {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    paidServices: PaidServiceResponseDto[];
    eventPlans: PlanTierResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const invalidateAppConfig = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
    const updatePlan = useUpdate<PlanTierResponseDto>({ dataProviderName: 'plan-tiers', mutationOptions: { onSuccess: invalidateAppConfig } });
    // useDelete's mutationOptions doesn't expose onSuccess, unlike useCreate/useUpdate — invalidate manually after it resolves.
    const deletePlan = useDelete<PlanTierResponseDto>();
    const setModules = useCustomMutation<PlanTierResponseDto>({ mutationOptions: { onSuccess: invalidateAppConfig } });
    const createPaidService = useCreate<PaidServiceResponseDto>({ mutationOptions: { onSuccess: invalidateAppConfig } });
    const updatePaidService = useUpdate<PaidServiceResponseDto>({ mutationOptions: { onSuccess: invalidateAppConfig } });
    const formRef = useRef<HTMLFormElement>(null);
    const [tab, setTab] = useState('details');
    const [moduleKeys, setModuleKeys] = useState(plan.moduleKeys);
    const [visibility, setVisibility] = useState<Visibility>(visibilityOf(plan));
    const [planChangeCount, setPlanChangeCount] = useState(0);
    const [unlockDraft, setUnlockDraft] = useState<UnlockDraft | null>(null);
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isEvent = scope === 'EVENT';
    const editorId = `plan-editor-${plan.id}`;
    const orderedModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const storageInput = storageBytesToInput(plan.storageBytes);
    const error =
        updatePlan.mutation.error ?? deletePlan.mutation.error ?? setModules.mutation.error ?? createPaidService.mutation.error ?? updatePaidService.mutation.error;
    const areModulesDirty = !sameStringSet(plan.moduleKeys, moduleKeys);
    const moduleChangeCount = areModulesDirty ? moduleChangeSummary(plan.moduleKeys, moduleKeys, orderedModules).length : 0;
    const changeCount = planChangeCount + moduleChangeCount;
    const canSave = changeCount > 0;
    const isSaving = updatePlan.mutation.isPending || setModules.mutation.isPending;

    const tabs = useMemo<AdminTabDefinition[]>(() => {
        const items: AdminTabDefinition[] = [
            { key: 'details', label: t('plans.tabs.details') },
            { key: 'limits', label: t('plans.tabs.limits') },
            { key: 'pricing', label: t('plans.tabs.pricing') },
        ];
        if (isEvent) items.push({ key: 'modules', label: t('plans.tabs.modules'), badge: moduleKeys.length });
        items.push({ key: 'danger', label: t('plans.tabs.danger'), tone: 'danger' });
        return items;
    }, [isEvent, moduleKeys.length, t]);

    function handleMakeDefaultClick() {
        setMakeDefaultOpen(true);
    }

    function handleMakeDefaultClose() {
        setMakeDefaultOpen(false);
    }

    async function handleMakeDefaultConfirm() {
        await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: { isDefault: true } });
        setMakeDefaultOpen(false);
    }

    function handleDeleteOpenClick() {
        setDeleteOpen(true);
    }

    function handleDeleteClose() {
        setDeleteOpen(false);
    }

    function handleSaveClose() {
        setPendingSave(null);
    }

    async function handleSaveConfirm() {
        if (!pendingSave) return;
        if (pendingSave.changes.length > 0) {
            await updatePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, values: pendingSave.patch });
        }
        if (pendingSave.moduleChanges.length > 0) {
            await setModules.mutateAsync({
                url: endpoints.admin.planTiers.modules(plan.id),
                method: 'put',
                values: { moduleKeys: pendingSave.moduleKeys },
                dataProviderName: 'plan-tiers',
            });
        }
        setPlanChangeCount(0);
        setPendingSave(null);
    }

    async function handleDeleteConfirm() {
        await deletePlan.mutateAsync({ resource: 'plan-tiers', id: plan.id, dataProviderName: 'plan-tiers' });
        invalidateAppConfig();
        setDeleteOpen(false);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave) return;
        const patch = planPatchFromFormData(plan, new FormData(event.currentTarget), visibility);
        setPendingSave({
            patch,
            moduleKeys,
            changes: planChangeSummary(plan, patch, t),
            moduleChanges: moduleChangeSummary(plan.moduleKeys, moduleKeys, orderedModules),
        });
    }

    function recomputePlanChanges(currentVisibility: Visibility) {
        if (!formRef.current) return;
        const patch = planPatchFromFormData(plan, new FormData(formRef.current), currentVisibility);
        setPlanChangeCount(planChangeSummary(plan, patch, t).length);
    }

    function handleFormChange() {
        recomputePlanChanges(visibility);
    }

    function handleVisibilityChange(next: Visibility) {
        setVisibility(next);
        recomputePlanChanges(next);
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        const moduleKey = event.currentTarget.value;
        setModuleKeys((current) => (current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey]));
        // Including a module makes selling it as an add-on moot, so an open composer
        // for it would be left dangling.
        setUnlockDraft((current) => (current?.moduleKey === moduleKey ? null : current));
    }

    const moduleUnlocks = paidServices.filter((service) => service.kind === 'MODULE_UNLOCK' && service.grantsModuleKey);

    function unlockAppliesToPlan(service: PaidServiceResponseDto) {
        return service.planTierIds.length === 0 || service.planTierIds.includes(plan.id);
    }

    async function addUnlockToPlan(service: PaidServiceResponseDto) {
        if (unlockAppliesToPlan(service)) return;
        await updatePaidService.mutateAsync({ resource: 'paid-services', id: service.id, values: { planTierIds: [...service.planTierIds, plan.id] } });
    }

    async function removeUnlockFromPlan(service: PaidServiceResponseDto) {
        if (!unlockAppliesToPlan(service)) return;

        // An empty plan list means "every plan", so dropping this one plan has to
        // be expressed as the remaining plans rather than as a shorter list.
        const remainingPlanIds =
            service.planTierIds.length === 0
                ? eventPlans.filter((eventPlan) => eventPlan.id !== plan.id).map((eventPlan) => eventPlan.id)
                : service.planTierIds.filter((id) => id !== plan.id);

        await updatePaidService.mutateAsync({
            resource: 'paid-services',
            id: service.id,
            values: remainingPlanIds.length > 0 ? { planTierIds: remainingPlanIds } : { isAssignable: false, isPublic: false },
        });
    }

    function handleUnlockAction(event: React.MouseEvent<HTMLButtonElement>) {
        const service = moduleUnlocks.find((item) => item.id === event.currentTarget.dataset.serviceId);
        if (!service) return;
        if (event.currentTarget.dataset.action === 'remove') void removeUnlockFromPlan(service);
        else void addUnlockToPlan(service);
    }

    function openUnlockEditor(event: React.MouseEvent<HTMLButtonElement>) {
        const moduleKey = event.currentTarget.dataset.moduleKey;
        const moduleItem = orderedModules.find((item) => item.moduleKey === moduleKey);
        if (!moduleKey || !moduleItem) return;
        setUnlockDraft({
            moduleKey,
            moduleName: moduleItem.name,
            name: t('plans.modules.defaultAddonName', { module: moduleItem.name }),
            description: '',
            price: '0',
            priceCurrency: defaultCurrency(plan),
        });
    }

    const closeUnlockEditor = useCallback(() => setUnlockDraft(null), []);

    function updateUnlockDraft(event: React.ChangeEvent<HTMLInputElement>) {
        // The composer sits inside the plan form, so its inputs are controlled and
        // deliberately unnamed: a stray `name` or `price` field would otherwise land
        // in the plan's FormData and be read as a plan edit.
        const field = event.currentTarget.dataset.field;
        const { value } = event.currentTarget;
        if (!field) return;
        setUnlockDraft((current) => (current ? { ...current, [field]: value } : current));
    }

    async function createUnlock() {
        if (!unlockDraft) return;

        await createPaidService.mutateAsync({
            resource: 'paid-services',
            values: {
                // The code never reaches the form: it is an internal identifier derived
                // from the name the admin typed.
                code: codeFromName(
                    `unlock ${plan.code} ${unlockDraft.moduleKey}`,
                    paidServices.map((service) => service.code)
                ),
                kind: 'MODULE_UNLOCK',
                name: unlockDraft.name.trim(),
                description: unlockDraft.description.trim() || null,
                sortOrder: Math.max(-1, ...paidServices.map((service) => service.sortOrder)) + 1,
                isAssignable: true,
                isPublic: true,
                priceAmountMinor: priceInputToMinor(unlockDraft.price) ?? 0,
                priceCurrency: unlockDraft.priceCurrency.trim().toUpperCase(),
                billingPeriod: 'MONTHLY',
                grantsStorageBytes: null,
                grantsModuleKey: unlockDraft.moduleKey,
                planTierIds: [plan.id],
            },
        });
        setUnlockDraft(null);
    }

    const canCreateUnlock = Boolean(unlockDraft?.name.trim() && unlockDraft.priceCurrency.trim()) && !createPaidService.mutation.isPending;

    function handleCreateUnlockClick() {
        void createUnlock();
    }

    function handleComposerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        // The composer is not its own form — it is nested in the plan form — so Enter
        // would submit the plan instead of creating the add-on.
        if (event.key === 'Enter') {
            event.preventDefault();
            if (canCreateUnlock) void createUnlock();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setUnlockDraft(null);
        }
    }

    return (
        <article className={cn('min-w-0', plan.isAssignable ? '' : 'opacity-90')}>
            <header className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-2xl font-bold tracking-tight text-ink">{plan.name}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{plan.code}</span>
                        {plan.isDefault && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                                {t('plans.default')}
                            </span>
                        )}
                        {!plan.isAssignable && (
                            <span className="rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-semibold text-status-warn">
                                {t('plans.archived')}
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-muted">
                        <span className="rounded-full bg-surface-muted px-2 py-1">{formatPlanMoney(plan) ?? t('plans.noPrice')}</span>
                        <span className="rounded-full bg-surface-muted px-2 py-1">
                            {isEvent
                                ? `${formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')} ${t('plans.members')}`
                                : `${formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')} ${t('plans.eventsPerUser')}`}
                        </span>
                        {isEvent && (
                            <span className="rounded-full bg-surface-muted px-2 py-1">
                                {formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')} {t('plans.storage')}
                            </span>
                        )}
                    </div>
                </div>

                {!plan.isDefault && (
                    <button
                        type="button"
                        onClick={handleMakeDefaultClick}
                        disabled={updatePlan.mutation.isPending}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary-light px-4 text-sm font-bold text-primary-dark transition hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                    >
                        {t('plans.makeDefault')}
                    </button>
                )}
            </header>

            <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange}>
                <AdminTabs id={editorId} tabs={tabs} active={tab} onSelect={setTab} className="mt-4" />

                <AdminTabPanel id={editorId} tabKey="details" active={tab} className="pt-5">
                    <div className="grid gap-3 sm:grid-cols-6">
                        <AdminField label={t('fields.name')} required className="sm:col-span-4">
                            <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.sort')} optional className="sm:col-span-2">
                            <input name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} className={adminInputClass('max-w-24')} />
                        </AdminField>
                        <AdminField label={t('fields.description')} optional className="sm:col-span-6">
                            <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                        </AdminField>
                    </div>

                    <AdminSection title={t('plans.sections.availability')} className="mt-1">
                        <VisibilitySegmentedControl
                            title={t('fields.visibility')}
                            value={visibility}
                            onChange={handleVisibilityChange}
                            labels={{
                                LIVE: t('fields.visibilityLive'),
                                HIDDEN: t('fields.visibilityHidden'),
                                ARCHIVED: t('fields.visibilityArchived'),
                            }}
                            hints={{
                                LIVE: t('fields.visibilityLiveHint'),
                                HIDDEN: t('fields.visibilityHiddenHint'),
                                ARCHIVED: t('fields.visibilityArchivedHint'),
                            }}
                        />
                    </AdminSection>
                </AdminTabPanel>

                <AdminTabPanel id={editorId} tabKey="limits" active={tab} className="pt-5">
                    <p className="mb-4 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.limitsHint')}</p>
                    {isEvent ? (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_6rem_minmax(0,10rem)]">
                            <AdminField label={t('fields.storage')} optional>
                                <input
                                    name="storageAmount"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    defaultValue={storageInput.amount}
                                    placeholder={t('fields.blankUnlimited')}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.unit')}>
                                <select name="storageUnit" defaultValue={storageInput.unit} className={adminInputClass()}>
                                    {STORAGE_UNITS.map((unit) => (
                                        <option key={unit} value={unit}>
                                            {unit}
                                        </option>
                                    ))}
                                </select>
                            </AdminField>
                            <AdminField label={t('fields.maxMembers')} optional>
                                <input
                                    name="maxMembers"
                                    type="number"
                                    min={0}
                                    defaultValue={plan.maxMembers ?? ''}
                                    placeholder={t('fields.blankUnlimited')}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                        </div>
                    ) : (
                        <AdminField label={t('fields.maxEventsPerUser')} optional className="max-w-64">
                            <input
                                name="maxActiveEvents"
                                type="number"
                                min={0}
                                defaultValue={plan.maxActiveEvents ?? ''}
                                placeholder={t('fields.blankUnlimited')}
                                className={adminInputClass()}
                            />
                        </AdminField>
                    )}
                </AdminTabPanel>

                <AdminTabPanel id={editorId} tabKey="pricing" active={tab} className="pt-5">
                    <div className="grid gap-3 sm:grid-cols-4">
                        <AdminField label={t('fields.price')} optional>
                            <input
                                name="price"
                                type="number"
                                min={0}
                                step="0.01"
                                defaultValue={priceMinorToInput(plan.priceAmountMinor)}
                                className={adminInputClass()}
                            />
                        </AdminField>
                        <AdminField label={t('fields.priceCurrency')} optional>
                            <input name="priceCurrency" maxLength={3} defaultValue={defaultCurrency(plan)} className={adminInputClass('max-w-24')} />
                        </AdminField>
                        <AdminField label={t('fields.billingPeriod')} optional className="sm:col-span-2">
                            <select name="billingPeriod" defaultValue={plan.billingPeriod ?? ''} className={adminInputClass('max-w-44')}>
                                <option value="">{t('none')}</option>
                                {BILLING_PERIODS.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        {isEvent && (
                            <>
                                <AdminField label={t('fields.recurringPrice')} optional>
                                    <input
                                        name="recurringPrice"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        defaultValue={priceMinorToInput(plan.recurringPriceAmountMinor)}
                                        className={adminInputClass()}
                                    />
                                </AdminField>
                                <AdminField label={t('fields.includedMonths')} optional>
                                    <input
                                        name="includedMonths"
                                        type="number"
                                        min={0}
                                        defaultValue={plan.includedMonths ?? ''}
                                        placeholder={t('none')}
                                        className={adminInputClass()}
                                    />
                                </AdminField>
                            </>
                        )}
                    </div>

                    <AdminSection title={t('plans.sections.promotion')} description={t('plans.sections.promotionHint')} className="mt-1">
                        <div className="grid gap-3 sm:grid-cols-4">
                            <AdminField label={t('fields.discountPercent')} optional>
                                <input
                                    name="discountPercent"
                                    type="number"
                                    min={0}
                                    max={100}
                                    defaultValue={plan.discountPercent ?? ''}
                                    placeholder={t('none')}
                                    className={adminInputClass('max-w-24')}
                                />
                            </AdminField>
                            <AdminField label={t('fields.discountLabel')} optional className="sm:col-span-3">
                                <input
                                    name="discountLabel"
                                    maxLength={100}
                                    defaultValue={plan.discountLabel ?? ''}
                                    placeholder={t('none')}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.discountStartsAt')} optional hint={t('fields.discountBoundHint')} className="sm:col-span-2">
                                <input
                                    name="discountStartsAt"
                                    type="datetime-local"
                                    defaultValue={instantToLocalInput(plan.discountStartsAt)}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('fields.discountEndsAt')} optional hint={t('fields.discountEndsAtHint')} className="sm:col-span-2">
                                <input
                                    name="discountEndsAt"
                                    type="datetime-local"
                                    defaultValue={instantToLocalInput(plan.discountEndsAt)}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                        </div>
                    </AdminSection>
                </AdminTabPanel>

                {isEvent && (
                    <AdminTabPanel id={editorId} tabKey="modules" active={tab} className="pt-5">
                        <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.modulesHint')}</p>
                        <div className="divide-y divide-border/70">
                            {orderedModules.map((module) => {
                                const included = moduleKeys.includes(module.moduleKey);
                                const unlocks = moduleUnlocks.filter((service) => service.grantsModuleKey === module.moduleKey);
                                const planUnlocks = unlocks.filter(unlockAppliesToPlan);
                                const otherUnlocks = unlocks.filter((service) => !unlockAppliesToPlan(service));
                                const composerOpen = unlockDraft?.moduleKey === module.moduleKey;

                                return (
                                    <div key={module.moduleKey} className="py-3 first:pt-0 last:pb-0">
                                        <AdminSwitch
                                            name={module.moduleKey}
                                            label={module.name}
                                            description={module.description ?? undefined}
                                            checked={included}
                                            onChange={handleModuleChange}
                                            optional={false}
                                        />
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-1 font-bold',
                                                    included
                                                        ? 'bg-status-good-wash text-status-good'
                                                        : planUnlocks.length > 0
                                                          ? 'bg-primary-light text-primary-dark'
                                                          : 'bg-status-warn-wash text-status-warn'
                                                )}
                                            >
                                                {included
                                                    ? t('plans.modules.included')
                                                    : planUnlocks.length > 0
                                                      ? t('plans.modules.paidAddon')
                                                      : t('plans.modules.unavailable')}
                                            </span>

                                            {planUnlocks.map((service) => (
                                                <span
                                                    key={service.id}
                                                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/70 py-1 pl-2.5 pr-1 font-semibold text-ink"
                                                >
                                                    {service.name}
                                                    <span className="font-medium text-ink-muted">
                                                        {formatMoney(locale, service.priceAmountMinor, service.priceCurrency)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        data-action="remove"
                                                        data-service-id={service.id}
                                                        onClick={handleUnlockAction}
                                                        disabled={updatePaidService.mutation.isPending}
                                                        title={t('plans.modules.removeAddon')}
                                                        aria-label={t('plans.modules.removeAddonFrom', { addon: service.name })}
                                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition hover:bg-status-danger-wash hover:text-status-danger disabled:opacity-50"
                                                    >
                                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                                    </button>
                                                </span>
                                            ))}

                                            {!included &&
                                                otherUnlocks.map((service) => (
                                                    <button
                                                        key={service.id}
                                                        type="button"
                                                        data-service-id={service.id}
                                                        onClick={handleUnlockAction}
                                                        disabled={updatePaidService.mutation.isPending}
                                                        className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 font-bold text-ink-muted transition hover:bg-surface-muted disabled:opacity-50"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {t('plans.modules.useExistingAddon', { addon: service.name })}
                                                    </button>
                                                ))}

                                            {!included && planUnlocks.length === 0 && !composerOpen && (
                                                <button
                                                    type="button"
                                                    data-module-key={module.moduleKey}
                                                    onClick={openUnlockEditor}
                                                    className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 font-bold text-ink-muted transition hover:bg-surface-muted"
                                                >
                                                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                                    {t('plans.modules.createAddon')}
                                                </button>
                                            )}
                                        </div>

                                        {/* Composed in place rather than in a second dialog: stacking a
                                            form modal on top of the plan modal left two lit surfaces
                                            fighting each other, and this keeps the module list in view. */}
                                        {composerOpen && unlockDraft && (
                                            <div
                                                onKeyDown={handleComposerKeyDown}
                                                className="mt-3 rounded-lg border border-border bg-surface-muted/40 p-3"
                                            >
                                                <p className="text-sm font-bold text-ink">
                                                    {t('plans.modules.createAddonTitle', { module: unlockDraft.moduleName })}
                                                </p>
                                                <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                                                    {t('plans.modules.createAddonSubtitle', { plan: plan.name })}
                                                </p>

                                                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem]">
                                                    <AdminField label={t('paidServices.fields.name')} required>
                                                        <input
                                                            data-field="name"
                                                            value={unlockDraft.name}
                                                            onChange={updateUnlockDraft}
                                                            className={adminInputClass()}
                                                        />
                                                    </AdminField>
                                                    <AdminField label={t('paidServices.fields.price')} required>
                                                        <input
                                                            data-field="price"
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            value={unlockDraft.price}
                                                            onChange={updateUnlockDraft}
                                                            className={adminInputClass()}
                                                        />
                                                    </AdminField>
                                                    <AdminField label={t('paidServices.fields.priceCurrency')} required>
                                                        <input
                                                            data-field="priceCurrency"
                                                            maxLength={3}
                                                            value={unlockDraft.priceCurrency}
                                                            onChange={updateUnlockDraft}
                                                            className={adminInputClass()}
                                                        />
                                                    </AdminField>
                                                    <AdminField
                                                        label={t('paidServices.fields.description')}
                                                        optional
                                                        className="sm:col-span-3"
                                                    >
                                                        <input
                                                            data-field="description"
                                                            value={unlockDraft.description}
                                                            onChange={updateUnlockDraft}
                                                            className={adminInputClass()}
                                                        />
                                                    </AdminField>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                                    <p className="text-[11px] leading-4 text-ink-faint">{t('paidServices.fields.priceHint')}</p>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={closeUnlockEditor}
                                                            className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-bold text-ink-muted transition hover:bg-surface-muted"
                                                        >
                                                            {t('cancel')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCreateUnlockClick}
                                                            disabled={!canCreateUnlock}
                                                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-bold text-white transition hover:bg-ink/90 disabled:opacity-50"
                                                        >
                                                            {createPaidService.mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                            {t('plans.modules.saveAddon')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </AdminTabPanel>
                )}

                <AdminTabPanel id={editorId} tabKey="danger" active={tab} className="pt-5">
                    <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.destructiveHint')}</p>
                    <div className="rounded-lg border border-status-danger-wash bg-status-danger-wash/40 px-4 py-1">
                        <DangerRow title={t('plans.delete')} body={t('plans.deleteConfirmBody')}>
                            <button
                                type="button"
                                onClick={handleDeleteOpenClick}
                                disabled={deletePlan.mutation.isPending}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-status-danger px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('plans.delete')}
                            </button>
                        </DangerRow>
                    </div>
                </AdminTabPanel>

                {/* Sticky so an edit made on one tab is never saved by accident from
                    another, and never lost behind a scroll. */}
                <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
                    <p className={cn('text-xs font-semibold', canSave ? 'text-ink' : 'text-ink-muted')}>
                        {canSave ? t('plans.pendingChanges', { count: changeCount }) : t('plans.noPendingChanges')}
                    </p>
                    <button
                        type="submit"
                        disabled={!canSave || isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:bg-ink/90 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        {t('save')}
                    </button>
                </div>
            </form>

            {error && <p className="mt-3 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

            <ConfirmActionModal
                open={makeDefaultOpen}
                onClose={handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { plan: plan.name })}
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
                title={t('plans.saveConfirmTitle', { plan: plan.name })}
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
                title={t('plans.deleteConfirmTitle', { plan: plan.name })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={deletePlan.mutation.isPending}
                onConfirm={handleDeleteConfirm}
            />
        </article>
    );
}

function DangerRow({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border-t border-status-danger-wash py-4 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:max-w-lg">
                <p className="text-sm font-bold text-status-danger">{title}</p>
                <p className="mt-1 text-xs leading-5 text-status-danger/70">{body}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}
