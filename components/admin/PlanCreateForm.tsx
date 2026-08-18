'use client';

import { useCreate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { codeFromName, localInputToInstant, priceInputToMinor, STORAGE_UNITS, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey, checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
import { type Visibility, visibilityFlags } from '@/lib/adminVisibility';
import type { BillingPeriod, PlanScope, PlanTierRequestDto, PlanTierResponseDto } from '@/lib/api/types';

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'YEARLY', 'ONE_TIME'];

export function PlanCreateForm({
    open,
    onClose,
    plans,
    scope,
}: {
    open: boolean;
    onClose: () => void;
    plans: PlanTierResponseDto[];
    scope: PlanScope;
}) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    const invalidateAppConfig = () => {
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
    const { mutateAsync: createPlan, mutation: createMutation } = useCreate<PlanTierResponseDto>({
        dataProviderName: 'plan-tiers',
        mutationOptions: { onSuccess: invalidateAppConfig },
    });
    const formRef = useRef<HTMLFormElement>(null);
    const [name, setName] = useState('');
    const [codeOverride, setCodeOverride] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<Visibility>('LIVE');
    const nextSortOrder = useMemo(() => Math.max(-1, ...plans.map((plan) => plan.sortOrder)) + 1, [plans]);

    // The code is an identifier the admin should not have to invent: it follows the
    // name until they deliberately type over it.
    const code = codeOverride ?? codeFromName(name, plans.map((plan) => plan.code));

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setName(event.target.value), []);
    // Clearing the field hands the code back to the name rather than pinning it empty.
    const handleCodeChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => setCodeOverride(event.target.value === '' ? null : event.target.value.toUpperCase()),
        []
    );

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
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
            storageBytes: scope === 'EVENT' ? storageInputToBytes(formData.get('storageAmount'), formData.get('storageUnit')) : null,
            maxMembers: scope === 'EVENT' ? numberOrNull(formData.get('maxMembers')) : null,
            maxActiveEvents: scope === 'ACCOUNT' ? numberOrNull(formData.get('maxActiveEvents')) : null,
            priceAmountMinor: priceInputToMinor(formData.get('price')),
            priceCurrency: emptyToNull(formData.get('priceCurrency'))?.toUpperCase() ?? null,
            billingPeriod: (emptyToNull(formData.get('billingPeriod')) as BillingPeriod | null) ?? null,
            recurringPriceAmountMinor: scope === 'EVENT' ? priceInputToMinor(formData.get('recurringPrice')) : null,
            includedMonths: scope === 'EVENT' ? numberOrNull(formData.get('includedMonths')) : null,
            discountPercent: numberOrNull(formData.get('discountPercent')),
            discountLabel: emptyToNull(formData.get('discountLabel')),
            discountStartsAt: localInputToInstant(formData.get('discountStartsAt')),
            discountEndsAt: localInputToInstant(formData.get('discountEndsAt')),
        };

        await createPlan({ resource: 'plan-tiers', values: input });
        formRef.current?.reset();
        setName('');
        setCodeOverride(null);
        setVisibility('LIVE');
        onClose();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onClose}
            closeLabel={t('cancel')}
            title={t('plans.create.title')}
            subtitle={t('plans.create.subtitle')}
            footer={
                <>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{scope}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            form="plan-create-form"
                            disabled={createMutation.isPending}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('plans.create.submit')}
                        </button>
                    </div>
                </>
            }
        >
            <form id="plan-create-form" ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <AdminSection title={t('plans.sections.identity')}>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
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
                        <AdminField label={t('fields.description')} optional className="col-span-2 md:col-span-4">
                            <input name="description" className={adminInputClass()} />
                        </AdminField>
                    </div>
                </AdminSection>

                <AdminSection title={t('plans.sections.limits')}>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                        {scope === 'EVENT' ? (
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
                                        <select name="storageUnit" defaultValue="GB" className={adminInputClass('max-w-20')}>
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
                        ) : (
                            <AdminField label={t('fields.maxEventsPerUser')} optional className="col-span-2">
                                <input
                                    name="maxActiveEvents"
                                    type="number"
                                    min={0}
                                    placeholder={t('fields.blankUnlimited')}
                                    className={adminInputClass('max-w-28')}
                                />
                            </AdminField>
                        )}
                    </div>
                </AdminSection>

                <AdminSection title={t('plans.sections.pricing')}>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                        <AdminField label={t('fields.price')} optional className="col-span-1">
                            <input name="price" type="number" min={0} step="0.01" placeholder="499" className={adminInputClass('max-w-32')} />
                        </AdminField>
                        <AdminField label={t('fields.priceCurrency')} optional className="col-span-1">
                            <input name="priceCurrency" maxLength={3} placeholder="EUR" className={adminInputClass('max-w-20')} />
                        </AdminField>
                        <AdminField label={t('fields.billingPeriod')} optional className="col-span-2">
                            <select name="billingPeriod" className={adminInputClass('max-w-40')}>
                                <option value="">{t('none')}</option>
                                {BILLING_PERIODS.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        {scope === 'EVENT' && (
                            <>
                                <AdminField label={t('fields.recurringPrice')} optional className="col-span-1">
                                    <input
                                        name="recurringPrice"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="15"
                                        className={adminInputClass('max-w-32')}
                                    />
                                </AdminField>
                                <AdminField label={t('fields.includedMonths')} optional className="col-span-1">
                                    <input name="includedMonths" type="number" min={0} placeholder="3" className={adminInputClass('max-w-24')} />
                                </AdminField>
                            </>
                        )}
                    </div>
                </AdminSection>

                <AdminSection title={t('plans.sections.promotion')} description={t('plans.sections.promotionHint')}>
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                        <AdminField label={t('fields.discountPercent')} optional className="col-span-1">
                            <input name="discountPercent" type="number" min={0} max={100} className={adminInputClass('max-w-24')} />
                        </AdminField>
                        <AdminField label={t('fields.discountLabel')} optional className="col-span-1 md:col-span-3">
                            <input name="discountLabel" maxLength={100} className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.discountStartsAt')} optional hint={t('fields.discountBoundHint')} className="col-span-1 md:col-span-2">
                            <input name="discountStartsAt" type="datetime-local" className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.discountEndsAt')} optional hint={t('fields.discountEndsAtHint')} className="col-span-1 md:col-span-2">
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
                        onChange={setVisibility}
                        labels={{ LIVE: t('fields.visibilityLive'), HIDDEN: t('fields.visibilityHidden'), ARCHIVED: t('fields.visibilityArchived') }}
                        hints={{
                            LIVE: t('fields.visibilityLiveHint'),
                            HIDDEN: t('fields.visibilityHiddenHint'),
                            ARCHIVED: t('fields.visibilityArchivedHint'),
                        }}
                    />
                </AdminSection>

                {createMutation.error && (
                    <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(createMutation.error)}`)}</p>
                )}
            </form>
        </AdminDrawer>
    );
}
