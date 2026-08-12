'use client';

import { Archive, ArchiveRestore, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useMemo, useRef, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { PlanSaveSummary } from '@/components/admin/PlanSaveSummary';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeletePlanTier, useSetPlanModules, useUpdatePlanTier } from '@/hooks/useAdmin';
import { moduleChangeSummary, type PendingPlanSave, planChangeSummary, planPatchFromFormData, sameStringSet } from '@/lib/adminPlanEditor';
import { defaultCurrency, priceMinorToInput, STORAGE_UNITS, storageBytesToInput } from '@/lib/adminPlanForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { BillingPeriod, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'YEARLY', 'ONE_TIME'];

export function PlanEditorCard({
    plan,
    modules,
    scope,
}: {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    scope: 'ACCOUNT' | 'EVENT';
}) {
    const t = useTranslations('AdminPage');
    const updatePlan = useUpdatePlanTier();
    const deletePlan = useDeletePlanTier();
    const setModules = useSetPlanModules();
    const formRef = useRef<HTMLFormElement>(null);
    const [moduleKeys, setModuleKeys] = useState(plan.moduleKeys);
    const [isPlanDirty, setIsPlanDirty] = useState(false);
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingSave, setPendingSave] = useState<PendingPlanSave | null>(null);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const enabledModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const storageInput = storageBytesToInput(plan.storageBytes);
    const error = updatePlan.error ?? deletePlan.error ?? setModules.error;
    const areModulesDirty = !sameStringSet(plan.moduleKeys, moduleKeys);
    const canSave = isPlanDirty || areModulesDirty;

    function handleMakeDefaultClick() {
        setMakeDefaultOpen(true);
    }

    function handleMakeDefaultClose() {
        setMakeDefaultOpen(false);
    }

    async function handleMakeDefaultConfirm() {
        await updatePlan.mutateAsync({ id: plan.id, input: { isDefault: true } });
        setMakeDefaultOpen(false);
    }

    function handleArchiveClick() {
        setArchiveOpen(true);
    }

    function handleArchiveClose() {
        setArchiveOpen(false);
    }

    async function handleArchiveConfirm() {
        await updatePlan.mutateAsync({ id: plan.id, input: { isAssignable: false } });
        setArchiveOpen(false);
    }

    function handleRestoreClick() {
        setRestoreOpen(true);
    }

    function handleRestoreClose() {
        setRestoreOpen(false);
    }

    async function handleRestoreConfirm() {
        await updatePlan.mutateAsync({ id: plan.id, input: { isAssignable: true } });
        setRestoreOpen(false);
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
            await updatePlan.mutateAsync({ id: plan.id, input: pendingSave.patch });
        }
        if (pendingSave.moduleChanges.length > 0) {
            await setModules.mutateAsync({ id: plan.id, input: { moduleKeys: pendingSave.moduleKeys } });
        }
        setIsPlanDirty(false);
        setPendingSave(null);
    }

    async function handleDeleteConfirm() {
        await deletePlan.mutateAsync(plan.id);
        setDeleteOpen(false);
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!canSave) return;
        const patch = planPatchFromFormData(plan, formData);
        setPendingSave({
            patch,
            moduleKeys,
            changes: planChangeSummary(plan, patch, t),
            moduleChanges: moduleChangeSummary(plan.moduleKeys, moduleKeys, enabledModules),
        });
    }

    function handleFormChange() {
        if (!formRef.current) return;
        const patch = planPatchFromFormData(plan, new FormData(formRef.current));
        setIsPlanDirty(planChangeSummary(plan, patch, t).length > 0);
    }

    function toggleModule(moduleKey: string) {
        setModuleKeys((current) => (current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey]));
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        toggleModule(event.currentTarget.value);
    }

    const isEvent = scope === 'EVENT';

    return (
        <article className={cn('min-w-0', plan.isAssignable ? '' : 'opacity-80')}>
            <div className="flex flex-col gap-4 border-b-2 border-ink pb-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-bold tracking-tight text-ink">{plan.code}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{plan.scope}</span>
                        {plan.isDefault && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                                {t('plans.default')}
                            </span>
                        )}
                        {!plan.isAssignable && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {t('plans.archived')}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 truncate text-base font-medium text-ink-muted">{plan.name}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-muted">
                        <span className="rounded-full bg-surface-muted px-2 py-1">{formatPlanMoney(plan) ?? t('plans.noPrice')}</span>
                        <span className="rounded-full bg-surface-muted px-2 py-1">
                            {plan.scope === 'EVENT'
                                ? `${formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')} ${t('plans.members')}`
                                : `${formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')} ${t('plans.eventsPerUser')}`}
                        </span>
                        {plan.scope === 'EVENT' && (
                            <span className="rounded-full bg-surface-muted px-2 py-1">
                                {formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')} {t('plans.storage')}
                            </span>
                        )}
                        {plan.scope === 'EVENT' && plan.moduleKeys.length > 0 && (
                            <span className="rounded-full bg-surface-muted px-2 py-1">
                                {t('plans.moduleCount', { count: plan.moduleKeys.length })}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    {!plan.isDefault && (
                        <button
                            type="button"
                            onClick={handleMakeDefaultClick}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary-light px-4 text-sm font-bold text-primary-dark transition hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/25"
                        >
                            {t('plans.makeDefault')}
                        </button>
                    )}
                </div>
            </div>

            <div className="pt-6">
                <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange}>
                    <div
                        className={cn(
                            'grid gap-8',
                            isEvent ? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]' : 'xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'
                        )}
                    >
                        <div className="space-y-1">
                            <AdminSection title={t('plans.sections.identity')}>
                                <div className={cn('grid gap-3', isEvent ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
                                    <AdminField label={t('fields.name')} required className="col-span-2">
                                        <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                                    </AdminField>
                                    <AdminField
                                        label={t('fields.description')}
                                        optional
                                        className={isEvent ? 'col-span-2 lg:col-span-3' : 'col-span-2 lg:col-span-2'}
                                    >
                                        <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                                    </AdminField>
                                    <AdminField label={t('fields.sort')} optional className="col-span-1 lg:col-span-1">
                                        <input
                                            name="sortOrder"
                                            type="number"
                                            min={0}
                                            defaultValue={plan.sortOrder}
                                            className={adminInputClass('max-w-24')}
                                        />
                                    </AdminField>
                                </div>
                            </AdminSection>

                            {plan.scope === 'EVENT' && (
                                <AdminSection title={t('plans.sections.modules')}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-ink-muted">{t('plans.sections.modulesHint')}</p>
                                        <p className="text-xs font-semibold text-ink-muted">{t('save')}</p>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {enabledModules.map((module) => (
                                            <AdminSwitch
                                                key={module.moduleKey}
                                                name={module.moduleKey}
                                                label={module.name}
                                                description={module.description ?? module.moduleKey}
                                                checked={moduleKeys.includes(module.moduleKey)}
                                                onChange={handleModuleChange}
                                            />
                                        ))}
                                    </div>
                                </AdminSection>
                            )}
                        </div>

                        <div className="space-y-1 xl:border-l xl:border-border xl:pl-8">
                            <AdminSection title={t('plans.sections.limits')}>
                                <div className="grid grid-cols-2 gap-3">
                                    {plan.scope === 'EVENT' ? (
                                        <>
                                            <div className="col-span-2 grid grid-cols-[minmax(0,8rem)_5rem] gap-2">
                                                <AdminField label={t('fields.storage')} optional>
                                                    <input
                                                        name="storageAmount"
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        defaultValue={storageInput.amount}
                                                        placeholder={t('fields.blankUnlimited')}
                                                        className={adminInputClass('max-w-32')}
                                                    />
                                                </AdminField>
                                                <AdminField label={t('fields.unit')}>
                                                    <select
                                                        name="storageUnit"
                                                        defaultValue={storageInput.unit}
                                                        className={adminInputClass('max-w-20')}
                                                    >
                                                        {STORAGE_UNITS.map((unit) => (
                                                            <option key={unit} value={unit}>
                                                                {unit}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </AdminField>
                                            </div>
                                            <AdminField label={t('fields.maxMembers')} optional className="col-span-1">
                                                <input
                                                    name="maxMembers"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={plan.maxMembers ?? ''}
                                                    placeholder={t('fields.blankUnlimited')}
                                                    className={adminInputClass('max-w-20')}
                                                />
                                            </AdminField>
                                        </>
                                    ) : (
                                        <AdminField label={t('fields.maxEventsPerUser')} optional className="col-span-1">
                                            <input
                                                name="maxActiveEvents"
                                                type="number"
                                                min={0}
                                                defaultValue={plan.maxActiveEvents ?? ''}
                                                placeholder={t('fields.blankUnlimited')}
                                                className={adminInputClass('max-w-28')}
                                            />
                                        </AdminField>
                                    )}
                                </div>
                            </AdminSection>

                            <AdminSection title={t('plans.sections.pricing')}>
                                <div className="grid grid-cols-2 gap-3">
                                    <AdminField label={t('fields.price')} optional>
                                        <input
                                            name="price"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            defaultValue={priceMinorToInput(plan.priceAmountMinor)}
                                            className={adminInputClass('max-w-32')}
                                        />
                                    </AdminField>
                                    <AdminField label={t('fields.priceCurrency')} optional>
                                        <input
                                            name="priceCurrency"
                                            maxLength={3}
                                            defaultValue={defaultCurrency(plan)}
                                            className={adminInputClass('max-w-20')}
                                        />
                                    </AdminField>
                                    <AdminField label={t('fields.billingPeriod')} optional className="col-span-2">
                                        <select name="billingPeriod" defaultValue={plan.billingPeriod ?? ''} className={adminInputClass('max-w-40')}>
                                            <option value="">{t('none')}</option>
                                            {BILLING_PERIODS.map((item) => (
                                                <option key={item} value={item}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>
                                    </AdminField>
                                    {plan.scope === 'EVENT' && (
                                        <>
                                            <AdminField label={t('fields.recurringPrice')} optional>
                                                <input
                                                    name="recurringPrice"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    defaultValue={priceMinorToInput(plan.recurringPriceAmountMinor)}
                                                    className={adminInputClass('max-w-32')}
                                                />
                                            </AdminField>
                                            <AdminField label={t('fields.includedMonths')} optional>
                                                <input
                                                    name="includedMonths"
                                                    type="number"
                                                    min={0}
                                                    defaultValue={plan.includedMonths ?? ''}
                                                    placeholder={t('none')}
                                                    className={adminInputClass('max-w-20')}
                                                />
                                            </AdminField>
                                        </>
                                    )}
                                </div>
                            </AdminSection>

                            <AdminSection title={t('plans.sections.availability')}>
                                <div className="grid gap-3">
                                    <AdminSwitch
                                        name="isAssignable"
                                        label={t('fields.isAssignable')}
                                        description={t('fields.isAssignableHint')}
                                        defaultChecked={plan.isAssignable}
                                    />
                                    <AdminSwitch
                                        name="isPublic"
                                        label={t('fields.isPublic')}
                                        description={t('fields.isPublicHint')}
                                        defaultChecked={plan.isPublic}
                                    />
                                </div>
                            </AdminSection>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border bg-surface-muted/45 px-4 py-4">
                        <p className="text-sm font-medium text-ink-muted">{t('plans.saveConfirmBody')}</p>
                        <button
                            type="submit"
                            disabled={!canSave || updatePlan.isPending || setModules.isPending}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:opacity-50"
                        >
                            {updatePlan.isPending || setModules.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Pencil className="h-4 w-4" />
                            )}
                            {t('save')}
                        </button>
                    </div>
                </form>

                {error && <p className="mt-3 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-rose-200 bg-rose-50/45 px-4 py-4">
                    <p className="text-xs font-medium text-rose-900/70">{t('plans.destructiveHint')}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                        {plan.isAssignable && (
                            <button
                                type="button"
                                onClick={handleArchiveClick}
                                disabled={updatePlan.isPending}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-bold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted"
                            >
                                <Archive className="h-3.5 w-3.5" />
                                {t('plans.archive')}
                            </button>
                        )}
                        {!plan.isAssignable && (
                            <button
                                type="button"
                                onClick={handleRestoreClick}
                                disabled={updatePlan.isPending}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                {t('plans.restore')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDeleteOpenClick}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-700"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('plans.delete')}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmActionModal
                open={makeDefaultOpen}
                onClose={handleMakeDefaultClose}
                title={t('plans.makeDefaultConfirmTitle', { code: plan.code })}
                body={t('plans.makeDefaultConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.makeDefault')}
                isConfirming={updatePlan.isPending}
                onConfirm={handleMakeDefaultConfirm}
                tone="default"
            />

            <ConfirmActionModal
                open={Boolean(pendingSave)}
                onClose={handleSaveClose}
                title={t('plans.saveConfirmTitle', { code: plan.code })}
                body={<PlanSaveSummary pendingSave={pendingSave} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={updatePlan.isPending || setModules.isPending}
                onConfirm={handleSaveConfirm}
                tone="default"
                size="md"
            />

            <ConfirmActionModal
                open={archiveOpen}
                onClose={handleArchiveClose}
                title={t('plans.archiveConfirmTitle', { code: plan.code })}
                body={t('plans.archiveConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.archive')}
                isConfirming={updatePlan.isPending}
                onConfirm={handleArchiveConfirm}
            />

            <ConfirmActionModal
                open={restoreOpen}
                onClose={handleRestoreClose}
                title={t('plans.restoreConfirmTitle', { code: plan.code })}
                body={t('plans.restoreConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.restore')}
                isConfirming={updatePlan.isPending}
                onConfirm={handleRestoreConfirm}
                tone="default"
            />

            <ConfirmActionModal
                open={deleteOpen}
                onClose={handleDeleteClose}
                title={t('plans.deleteConfirmTitle', { code: plan.code })}
                body={t('plans.deleteConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.delete')}
                isConfirming={deletePlan.isPending}
                onConfirm={handleDeleteConfirm}
            />
        </article>
    );
}
