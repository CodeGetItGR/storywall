'use client';

import { Archive, ArchiveRestore, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDeletePlanTier, useSetPlanModules, useUpdatePlanTier } from '@/hooks/useAdmin';
import { defaultCurrency, priceInputToMinor, priceMinorToInput, STORAGE_UNITS, storageBytesToInput, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey, checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
import type { BillingPeriod, PlanTierPatchDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
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
    const [moduleKeys, setModuleKeys] = useState(plan.moduleKeys);
    const [makeDefaultOpen, setMakeDefaultOpen] = useState(false);
    const [pendingPatch, setPendingPatch] = useState<PlanTierPatchDto | null>(null);
    const [modulesOpen, setModulesOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const enabledModules = useMemo(() => [...modules].sort((left, right) => left.sortOrder - right.sortOrder), [modules]);
    const storageInput = storageBytesToInput(plan.storageBytes);
    const error = updatePlan.error ?? deletePlan.error ?? setModules.error;

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

    function handleSaveModulesClick() {
        setModulesOpen(true);
    }

    function handleModulesClose() {
        setModulesOpen(false);
    }

    async function handleModulesConfirm() {
        await setModules.mutateAsync({ id: plan.id, input: { moduleKeys } });
        setModulesOpen(false);
    }

    function handleSaveClose() {
        setPendingPatch(null);
    }

    async function handleSaveConfirm() {
        if (!pendingPatch) return;
        await updatePlan.mutateAsync({ id: plan.id, input: pendingPatch });
        setPendingPatch(null);
    }

    async function handleDeleteConfirm() {
        await deletePlan.mutateAsync(plan.id);
        setDeleteOpen(false);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setPendingPatch({
            name: String(formData.get('name') ?? '').trim(),
            description: emptyToNull(formData.get('description')),
            sortOrder: Number(formData.get('sortOrder') ?? plan.sortOrder),
            isPublic: checked(formData, 'isPublic'),
            isAssignable: checked(formData, 'isAssignable'),
            storageBytes: plan.scope === 'EVENT' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
            maxMembers: plan.scope === 'EVENT' ? numberOrNull(formData.get('maxMembers')) : null,
            maxActiveEvents: plan.scope === 'ACCOUNT' ? numberOrNull(formData.get('maxActiveEvents')) : null,
            priceAmountMinor: priceInputToMinor(formData.get('price')),
            priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
            billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
            discountPercent: numberOrNull(formData.get('discountPercent')),
            discountLabel: emptyToNull(formData.get('discountLabel')),
            discountStartsAt: emptyToNull(formData.get('discountStartsAt')),
            discountEndsAt: emptyToNull(formData.get('discountEndsAt')),
        });
    }

    function toggleModule(moduleKey: string) {
        setModuleKeys((current) => (current.includes(moduleKey) ? current.filter((key) => key !== moduleKey) : [...current, moduleKey]));
    }

    function handleModuleChange(event: ChangeEvent<HTMLInputElement>) {
        toggleModule(event.currentTarget.value);
    }

    const isEvent = scope === 'EVENT';

    return (
        <article className={cn('border-b border-border py-6 last:border-b-0', plan.isAssignable ? '' : 'opacity-80')}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-ink">{plan.code}</h3>
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
                    <p className="mt-1 truncate text-base text-ink-muted">{plan.name}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-muted">
                        <span className="rounded-full bg-surface-muted px-2 py-1">{formatPlanMoney(plan) ?? t('plans.noPrice')}</span>
                        <span className="rounded-full bg-surface-muted px-2 py-1">
                            {plan.scope === 'EVENT'
                                ? `${formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')} ${t('plans.members')}`
                                : `${formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')} ${t('plans.activeEvents')}`}
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
                            className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark"
                        >
                            {t('plans.makeDefault')}
                        </button>
                    )}
                </div>
            </div>

            <div className="border-t border-border pt-6">
                <form onSubmit={handleSubmit}>
                    <div className={cn('grid gap-8', isEvent ? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]' : 'xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]')}>
                        <div className="space-y-4">
                            <AdminSection title={t('plans.sections.identity')}>
                                <div className={cn('grid gap-3', isEvent ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
                                    <AdminField label={t('fields.name')} className="col-span-2">
                                        <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                                    </AdminField>
                                    <AdminField label={t('fields.description')} className={isEvent ? 'col-span-2 lg:col-span-3' : 'col-span-2 lg:col-span-2'}>
                                        <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                                    </AdminField>
                                    <AdminField label={t('fields.sort')} className="col-span-1 lg:col-span-1">
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
                                        <button
                                            type="button"
                                            onClick={handleSaveModulesClick}
                                            disabled={setModules.isPending}
                                            className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark disabled:opacity-50"
                                        >
                                            {t('plans.saveModules')}
                                        </button>
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

                        <div className="space-y-4">
                            <AdminSection title={t('plans.sections.limits')}>
                                <div className="grid grid-cols-2 gap-3">
                                    {plan.scope === 'EVENT' ? (
                                        <>
                                            <div className="col-span-2 grid grid-cols-[minmax(0,8rem)_5rem] gap-2">
                                                <AdminField label={t('fields.storage')}>
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
                                            <AdminField label={t('fields.maxMembers')} className="col-span-1">
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
                                        <AdminField label={t('fields.maxActiveEvents')} className="col-span-1">
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
                                    <AdminField label={t('fields.price')}>
                                        <input
                                            name="price"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            defaultValue={priceMinorToInput(plan.priceAmountMinor)}
                                            className={adminInputClass('max-w-32')}
                                        />
                                    </AdminField>
                                    <AdminField label={t('fields.priceCurrency')}>
                                        <input
                                            name="priceCurrency"
                                            maxLength={3}
                                            defaultValue={defaultCurrency(plan)}
                                            className={adminInputClass('max-w-20')}
                                        />
                                    </AdminField>
                                    <AdminField label={t('fields.billingPeriod')} className="col-span-2">
                                        <select
                                            name="billingPeriod"
                                            defaultValue={plan.billingPeriod ?? ''}
                                            className={adminInputClass('max-w-40')}
                                        >
                                            <option value="">{t('none')}</option>
                                            {BILLING_PERIODS.map((item) => (
                                                <option key={item} value={item}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>
                                    </AdminField>
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
                                <button
                                    type="submit"
                                    disabled={updatePlan.isPending}
                                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-base font-semibold text-white disabled:opacity-50"
                                >
                                    {updatePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                                    {t('save')}
                                </button>
                            </AdminSection>
                        </div>
                    </div>
                </form>

                {error && <p className="mt-3 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(error)}`)}</p>}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-xs text-ink-muted">{t('plans.destructiveHint')}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                        {plan.isAssignable && (
                            <button
                                type="button"
                                onClick={handleArchiveClick}
                                disabled={updatePlan.isPending}
                                className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted"
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
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                            >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                {t('plans.restore')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDeleteOpenClick}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
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
                open={Boolean(pendingPatch)}
                onClose={handleSaveClose}
                title={t('plans.saveConfirmTitle', { code: plan.code })}
                body={t('plans.saveConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={updatePlan.isPending}
                onConfirm={handleSaveConfirm}
                tone="default"
            />

            <ConfirmActionModal
                open={modulesOpen}
                onClose={handleModulesClose}
                title={t('plans.modulesConfirmTitle', { code: plan.code })}
                body={t('plans.modulesConfirmBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('plans.saveModules')}
                isConfirming={setModules.isPending}
                onConfirm={handleModulesConfirm}
                tone="default"
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
