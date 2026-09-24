'use client';

import { useCreate, useCustomMutation, useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { PlanCreateAssignments } from '@/components/admin/PlanCreateAssignments';
import { PlanCreateDurations } from '@/components/admin/PlanCreateDurations';
import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import { useDuplicatePlanTier } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { usePlanCreateAssignments } from '@/hooks/usePlanCreateAssignments';
import { usePlanCreateDurations } from '@/hooks/usePlanCreateDurations';
import { codeFromName, defaultCurrency, localInputToInstant, priceInputToMinor, STORAGE_UNITS, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey, checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
import { type Visibility, visibilityFlags } from '@/lib/adminVisibility';
import { endpoints } from '@/lib/api/endpoints';
import type {
    BillingPeriod,
    EventTypeConvention,
    PlanScope,
    PlanTierRequestDto,
    PlanTierResponseDto,
    PlatformEventTypeResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';

const BILLING_PERIODS: BillingPeriod[] = ['ONE_TIME'];

type CloneRow = {
    rowId: string;
    eventTypeKey: EventTypeConvention | '';
    name: string;
    description: string;
    codeOverride: string | null;
};

function makeCloneRow(): CloneRow {
    return { rowId: Math.random().toString(36).slice(2), eventTypeKey: '', name: '', description: '', codeOverride: null };
}

export function PlanCreateForm({
    open,
    onCloseAction,
    onCreatedAction,
    plans,
    eventTypes,
    modules,
    scope,
    sourcePlan,
    initialEventTypeKey,
}: {
    open: boolean;
    onCloseAction: () => void;
    onCreatedAction: (name: string) => void;
    plans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    modules: PlatformModuleResponseDto[];
    scope: PlanScope;
    sourcePlan?: PlanTierResponseDto | null;
    initialEventTypeKey?: EventTypeConvention | null;
}) {
    return sourcePlan ? (
        <PlanDuplicateForm
            open={open}
            onCloseAction={onCloseAction}
            onCreatedAction={onCreatedAction}
            plans={plans}
            eventTypes={eventTypes}
            scope={scope}
            sourcePlan={sourcePlan}
        />
    ) : (
        <PlanCreateNewForm
            open={open}
            onCloseAction={onCloseAction}
            onCreatedAction={onCreatedAction}
            plans={plans}
            eventTypes={eventTypes}
            modules={modules}
            scope={scope}
            initialEventTypeKey={initialEventTypeKey ?? null}
        />
    );
}

function PlanDuplicateForm({
    open,
    onCloseAction,
    onCreatedAction,
    plans,
    eventTypes,
    scope,
    sourcePlan,
}: {
    open: boolean;
    onCloseAction: () => void;
    onCreatedAction: (name: string) => void;
    plans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    scope: PlanScope;
    sourcePlan: PlanTierResponseDto;
}) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const duplicatePlan = useDuplicatePlanTier();
    const [rows, setRows] = useState<CloneRow[]>([makeCloneRow()]);

    const orderedEventTypes = useMemo(() => [...eventTypes].sort((left, right) => left.sortOrder - right.sortOrder), [eventTypes]);
    const takenCodes = useMemo(() => plans.map((plan) => plan.code), [plans]);

    function resetForm() {
        setRows([makeCloneRow()]);
    }

    function handleClose() {
        resetForm();
        onCloseAction();
    }

    function addRow() {
        setRows((current) => [...current, makeCloneRow()]);
    }

    function removeRow(rowId: string) {
        setRows((current) => current.filter((row) => row.rowId !== rowId));
    }

    function updateRow(rowId: string, patch: Partial<CloneRow>) {
        setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)));
    }

    // Every other row's chosen event type (and the source's own) is off the table for this row.
    function availableEventTypesFor(rowId: string) {
        const usedElsewhere = new Set(rows.filter((row) => row.rowId !== rowId).map((row) => row.eventTypeKey));
        return orderedEventTypes.filter(
            (eventType) => eventType.eventTypeKey !== sourcePlan.eventTypeKey && !usedElsewhere.has(eventType.eventTypeKey),
        );
    }

    function codeForRow(row: CloneRow) {
        if (row.codeOverride !== null) return row.codeOverride;
        const nameForCode = row.name.trim() || `${sourcePlan.name} ${row.eventTypeKey}`;
        return codeFromName(nameForCode, takenCodes);
    }

    const canSubmit = rows.length > 0 && rows.every((row) => row.eventTypeKey && codeForRow(row));

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        await duplicatePlan.mutateAsync({
            planId: sourcePlan.id,
            clones: rows.map((row) => ({
                eventTypeKey: row.eventTypeKey as EventTypeConvention,
                code: codeForRow(row),
                name: row.name.trim() || undefined,
                description: emptyToNull(row.description) ?? undefined,
            })),
        });
        invalidate({ resource: 'plan-tiers', dataProviderName: 'plan-tiers', invalidates: ['list'] });
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        resetForm();
        onCreatedAction(sourcePlan.name);
    }

    return (
        <AdminDrawer
            open={open}
            onClose={handleClose}
            closeLabel={t('cancel')}
            title={t('plans.duplicate.title')}
            subtitle={t('plans.duplicate.subtitle', { plan: sourcePlan.name })}
            footer={
                <>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{scope}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form="plan-duplicate-form"
                            disabled={!canSubmit || duplicatePlan.isPending}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {duplicatePlan.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('plans.duplicate.submit')}
                        </button>
                    </div>
                </>
            }
        >
            <form id="plan-duplicate-form" onSubmit={handleSubmit} className="space-y-5">
                <AdminSection title={t('plans.duplicate.cloneTargetsTitle')} description={t('plans.duplicate.cloneTargetsHint')}>
                    <div className="space-y-4">
                        {rows.map((row) => (
                            <PlanCloneTargetRow
                                key={row.rowId}
                                row={row}
                                code={codeForRow(row)}
                                sourcePlan={sourcePlan}
                                eventTypeOptions={availableEventTypesFor(row.rowId)}
                                canRemove={rows.length > 1}
                                onUpdateAction={updateRow}
                                onRemoveAction={removeRow}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-muted hover:text-ink"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t('plans.duplicate.addTarget')}
                    </button>
                </AdminSection>

                {duplicatePlan.error && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(duplicatePlan.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}

function PlanCloneTargetRow({
    row,
    code,
    sourcePlan,
    eventTypeOptions,
    canRemove,
    onUpdateAction,
    onRemoveAction,
}: {
    row: CloneRow;
    code: string;
    sourcePlan: PlanTierResponseDto;
    eventTypeOptions: PlatformEventTypeResponseDto[];
    canRemove: boolean;
    onUpdateAction: (rowId: string, patch: Partial<CloneRow>) => void;
    onRemoveAction: (rowId: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    const handleEventTypeChange = useCallback(
        (changeEvent: ChangeEvent<HTMLSelectElement>) =>
            onUpdateAction(row.rowId, { eventTypeKey: changeEvent.currentTarget.value as EventTypeConvention | '' }),
        [onUpdateAction, row.rowId],
    );
    const handleCodeChange = useCallback(
        (changeEvent: ChangeEvent<HTMLInputElement>) => onUpdateAction(row.rowId, { codeOverride: changeEvent.target.value.toUpperCase() }),
        [onUpdateAction, row.rowId],
    );
    const handleNameChange = useCallback(
        (changeEvent: ChangeEvent<HTMLInputElement>) => onUpdateAction(row.rowId, { name: changeEvent.target.value }),
        [onUpdateAction, row.rowId],
    );
    const handleDescriptionChange = useCallback(
        (changeEvent: ChangeEvent<HTMLInputElement>) => onUpdateAction(row.rowId, { description: changeEvent.target.value }),
        [onUpdateAction, row.rowId],
    );
    const handleRemove = useCallback(() => onRemoveAction(row.rowId), [onRemoveAction, row.rowId]);

    return (
        <div className="rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-2.5">
                <AdminField label={t('plans.tabs.eventTypes')} required className="col-span-2 sm:col-span-1">
                    <select required value={row.eventTypeKey} onChange={handleEventTypeChange} className={adminInputClass()}>
                        <option value="" disabled>
                            {t('planAvailability.selectType')}
                        </option>
                        {eventTypeOptions.map((eventType) => (
                            <option key={eventType.eventTypeKey} value={eventType.eventTypeKey} disabled={!eventType.isEnabled}>
                                {localizedText(eventType.name)}
                            </option>
                        ))}
                    </select>
                </AdminField>
                <AdminField label={t('fields.code')} required hint={t('fields.codeHint')} className="col-span-2 sm:col-span-1">
                    <input required value={code} onChange={handleCodeChange} spellCheck={false} className={adminInputClass('font-mono')} />
                </AdminField>
                <AdminField label={t('fields.name')} optional className="col-span-2">
                    <input value={row.name} onChange={handleNameChange} placeholder={sourcePlan.name} maxLength={100} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.description')} optional className="col-span-2">
                    <input
                        value={row.description}
                        onChange={handleDescriptionChange}
                        placeholder={sourcePlan.description ?? ''}
                        className={adminInputClass()}
                    />
                </AdminField>
            </div>
            {canRemove && (
                <button type="button" onClick={handleRemove} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-status-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('plans.duplicate.removeTarget')}
                </button>
            )}
        </div>
    );
}

function PlanCreateNewForm({
    open,
    onCloseAction,
    onCreatedAction,
    plans,
    eventTypes,
    modules,
    scope,
    initialEventTypeKey,
}: {
    open: boolean;
    onCloseAction: () => void;
    onCreatedAction: (name: string) => void;
    plans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    modules: PlatformModuleResponseDto[];
    scope: PlanScope;
    initialEventTypeKey: EventTypeConvention | null;
}) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const invalidate = useInvalidate();
    const onMutationSuccess = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
        invalidate({ resource: 'plan-tiers', dataProviderName: 'plan-tiers', invalidates: ['list'] });
    };
    const { mutateAsync: createPlan, mutation: createMutation } = useCreate<PlanTierResponseDto>({
        dataProviderName: 'plan-tiers',
        mutationOptions: { onSuccess: onMutationSuccess },
    });
    const { mutateAsync: setPlanModules, mutation: modulesMutation } = useCustomMutation<PlanTierResponseDto>({
        mutationOptions: { onSuccess: onMutationSuccess },
    });
    const formRef = useRef<HTMLFormElement>(null);
    const [name, setName] = useState('');
    const [codeOverride, setCodeOverride] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<Visibility>('LIVE');
    const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
    const nextSortOrder = useMemo(() => Math.max(-1, ...plans.map((plan) => plan.sortOrder)) + 1, [plans]);
    const assignments = usePlanCreateAssignments(eventTypes, modules, initialEventTypeKey);
    const durations = usePlanCreateDurations();
    const isEvent = scope === 'EVENT';
    const isPending = createMutation.isPending || durations.isCreating || modulesMutation.isPending;
    const mutationError = createMutation.error ?? durations.error ?? modulesMutation.error;
    // An EVENT plan needs its event type and at least one duration to be on sale.
    const canSubmit = !isPending && (!isEvent || (Boolean(assignments.eventTypeKey) && durations.isValid));

    // The code is an identifier the admin should not have to invent: it follows the
    // name until they deliberately type over it.
    const code =
        codeOverride ??
        codeFromName(
            name,
            plans.map((plan) => plan.code),
        );

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setName(event.target.value), []);
    // Clearing the field hands the code back to the name rather than pinning it empty.
    const handleCodeChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => setCodeOverride(event.target.value === '' ? null : event.target.value.toUpperCase()),
        [],
    );

    function resetForm() {
        formRef.current?.reset();
        setName('');
        setCodeOverride(null);
        setVisibility('LIVE');
        assignments.resetAssignments();
        durations.reset();
        setCreatedPlanId(null);
    }

    function handleClose() {
        resetForm();
        onCloseAction();
    }

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        const formData = new FormData(event.currentTarget);
        const flags = visibilityFlags(visibility);
        const input: PlanTierRequestDto = {
            code: String(formData.get('code') ?? '')
                .trim()
                .toUpperCase(),
            scope,
            name: String(formData.get('name') ?? '').trim(),
            description: emptyToNull(formData.get('description')),
            sortOrder: Number(formData.get('sortOrder') ?? 0),
            isDefault: checked(formData, 'isDefault'),
            isAssignable: flags.isAssignable,
            isPublic: flags.isPublic,
            // An EVENT plan is priced by its durations, created right after it.
            ...(isEvent
                ? {
                      storageBytes: storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')),
                      maxMembers: numberOrNull(formData.get('maxMembers')),
                  }
                : { priceAmountMinor: priceInputToMinor(formData.get('price')) }),
            priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
            billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
            discountPercent: numberOrNull(formData.get('discountPercent')),
            discountLabel: emptyToNull(formData.get('discountLabel')),
            discountStartsAt: localInputToInstant(formData.get('discountStartsAt')),
            discountEndsAt: localInputToInstant(formData.get('discountEndsAt')),
            eventTypeKey: isEvent ? (assignments.eventTypeKey ?? undefined) : undefined,
        };

        let planId = createdPlanId;
        if (!planId) {
            const created = await createPlan({ resource: 'plan-tiers', values: input });
            planId = created.data.id;
            setCreatedPlanId(planId);
        }
        if (isEvent) await durations.createAll(planId);
        if (assignments.moduleKeys.length > 0) {
            await setPlanModules({
                url: endpoints.admin.planTiers.modules(planId),
                method: 'put',
                values: { moduleKeys: assignments.moduleKeys },
                dataProviderName: 'plan-tiers',
            });
        }
        resetForm();
        onCreatedAction(input.name);
    }

    return (
        <AdminDrawer
            open={open}
            onClose={handleClose}
            closeLabel={t('cancel')}
            title={t('plans.create.title')}
            subtitle={t('plans.create.subtitle')}
            footer={
                <>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{scope}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form="plan-create-form"
                            disabled={!canSubmit}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('plans.create.submit')}
                        </button>
                    </div>
                </>
            }
        >
            <form id="plan-create-form" ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <AdminSection title={t('plans.sections.identity')}>
                    <div className="grid grid-cols-2 gap-2.5">
                        <AdminField label={t('fields.name')} required className="col-span-2">
                            <input required name="name" maxLength={100} value={name} onChange={handleNameChange} className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.code')} required hint={t('fields.codeHint')}>
                            <input
                                required
                                name="code"
                                placeholder="ENTERPRISE"
                                pattern="[A-Z0-9_]+"
                                maxLength={30}
                                value={code}
                                onChange={handleCodeChange}
                                spellCheck={false}
                                className={adminInputClass('font-mono')}
                            />
                        </AdminField>
                        <AdminField label={t('fields.sort')} required>
                            <input
                                required
                                name="sortOrder"
                                type="number"
                                min={0}
                                value={nextSortOrder}
                                readOnly
                                className={adminInputClass('max-w-24')}
                            />
                        </AdminField>
                        <AdminField label={t('fields.description')} optional className="col-span-2">
                            <input name="description" className={adminInputClass()} />
                        </AdminField>
                    </div>
                </AdminSection>

                <AdminSection title={t('plans.sections.limits')}>
                    <div className="grid grid-cols-2 gap-2.5">
                        {isEvent ? (
                            <>
                                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                                    <AdminField label={t('fields.storage')} optional>
                                        <input
                                            name="storageAmount"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            placeholder={t('fields.blankUnlimited')}
                                            className={adminInputClass('max-w-32')}
                                        />
                                    </AdminField>
                                    <AdminField label={t('fields.unit')}>
                                        <select name="storageUnit" defaultValue={STORAGE_UNITS[0]} className={adminInputClass('max-w-20')}>
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
                                        placeholder={t('fields.blankUnlimited')}
                                        className={adminInputClass('max-w-28')}
                                    />
                                </AdminField>
                            </>
                        ) : null}
                    </div>
                </AdminSection>

                {/* Durations */}
                {isEvent && <PlanCreateDurations durations={durations} />}

                {/* Pricing */}
                <AdminSection title={t('plans.sections.pricing')}>
                    <div className="grid grid-cols-2 gap-2.5">
                        {!isEvent && (
                            <AdminField label={t('fields.price')} optional className="col-span-1">
                                <input name="price" type="number" min={0} step="0.01" placeholder="499" className={adminInputClass('max-w-32')} />
                            </AdminField>
                        )}
                        {/* Every duration of an EVENT plan is sold in this currency. */}
                        <AdminField
                            label={t('fields.priceCurrency')}
                            required={isEvent}
                            optional={!isEvent}
                            hint={isEvent ? t('fields.priceCurrencyEventHint') : undefined}
                            className="col-span-1"
                        >
                            <input
                                name="priceCurrency"
                                required={isEvent}
                                maxLength={3}
                                defaultValue={isEvent ? defaultCurrency() : undefined}
                                placeholder="EUR"
                                className={adminInputClass('max-w-20')}
                            />
                        </AdminField>
                        <AdminField label={t('fields.billingPeriod')} optional className="col-span-2">
                            <select name="billingPeriod" defaultValue="" className={adminInputClass('max-w-40')}>
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

                <AdminSection title={t('plans.sections.promotion')} description={t('plans.sections.promotionHint')}>
                    <div className="grid grid-cols-2 gap-2.5">
                        <AdminField label={t('fields.discountPercent')} optional className="col-span-1">
                            <input name="discountPercent" type="number" min={0} max={100} className={adminInputClass('max-w-24')} />
                        </AdminField>
                        <AdminField label={t('fields.discountLabel')} optional className="col-span-1">
                            <input name="discountLabel" maxLength={100} className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.discountStartsAt')} optional hint={t('fields.discountBoundHint')} className="col-span-1">
                            <input name="discountStartsAt" type="datetime-local" className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.discountEndsAt')} optional hint={t('fields.discountEndsAtHint')} className="col-span-1">
                            <input name="discountEndsAt" type="datetime-local" className={adminInputClass()} />
                        </AdminField>
                    </div>
                </AdminSection>

                <AdminSection title={t('plans.sections.availability')}>
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 border-b border-border/70 py-2 text-sm font-semibold text-ink-muted">
                        <input type="checkbox" name="isDefault" className="h-4 w-4 accent-primary" />
                        <span>{t('fields.isDefault')}</span>
                    </label>
                    <VisibilitySegmentedControl
                        title={t('fields.visibility')}
                        value={visibility}
                        onChangeAction={setVisibility}
                        labels={{ LIVE: t('fields.visibilityLive'), HIDDEN: t('fields.visibilityHidden'), ARCHIVED: t('fields.visibilityArchived') }}
                        hints={{
                            LIVE: t('fields.visibilityLiveHint'),
                            HIDDEN: t('fields.visibilityHiddenHint'),
                            ARCHIVED: t('fields.visibilityArchivedHint'),
                        }}
                    />
                </AdminSection>

                {isEvent && (
                    <PlanCreateAssignments
                        eventTypeKey={assignments.eventTypeKey}
                        moduleKeys={assignments.moduleKeys}
                        eventTypes={assignments.orderedEventTypes}
                        modules={assignments.orderedModules}
                        eventTypeLocked={Boolean(initialEventTypeKey)}
                        onEventTypeSelectAction={assignments.handleEventTypeSelect}
                        onModuleChangeAction={assignments.handleModuleChange}
                    />
                )}

                {mutationError && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(mutationError)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
