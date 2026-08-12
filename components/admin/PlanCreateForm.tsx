'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useRef } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { Modal } from '@/components/ui/modal';
import { useCreatePlanTier } from '@/hooks/useAdmin';
import { priceInputToMinor, STORAGE_UNITS, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey, checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
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
    const createPlan = useCreatePlanTier();
    const formRef = useRef<HTMLFormElement>(null);
    const nextSortOrder = useMemo(() => Math.max(-1, ...plans.map((plan) => plan.sortOrder)) + 1, [plans]);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const input: PlanTierRequestDto = {
            code: String(formData.get('code') ?? '')
                .trim()
                .toUpperCase(),
            scope,
            name: String(formData.get('name') ?? '').trim(),
            description: emptyToNull(formData.get('description')),
            sortOrder: Number(formData.get('sortOrder') ?? 0),
            isDefault: checked(formData, 'isDefault'),
            isAssignable: checked(formData, 'isAssignable'),
            isPublic: checked(formData, 'isPublic'),
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
            discountStartsAt: emptyToNull(formData.get('discountStartsAt')),
            discountEndsAt: emptyToNull(formData.get('discountEndsAt')),
        };

        await createPlan.mutateAsync(input);
        formRef.current?.reset();
        onClose();
    }

    return (
        <Modal open={open} onClose={onClose} size="lg" closeLabel={t('cancel')}>
            <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-ink">{t('plans.create.title')}</h2>
                            <p className="text-sm text-ink-muted">{t('plans.create.subtitle')}</p>
                        </div>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{scope}</span>
                    </div>

                    <AdminSection title={t('plans.sections.identity')}>
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                            <AdminField label={t('fields.code')} required className="col-span-2 lg:col-span-2">
                                <input required name="code" placeholder="ENTERPRISE" pattern="[A-Z0-9_]+" maxLength={30} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.name')} required className="col-span-2 lg:col-span-2">
                                <input required name="name" maxLength={100} className={adminInputClass()} />
                            </AdminField>
                            <AdminField label={t('fields.sort')} required className="col-span-1 lg:col-span-1">
                                <input required name="sortOrder" type="number" min={0} value={nextSortOrder} readOnly className={adminInputClass('max-w-24')} />
                            </AdminField>
                            <AdminField label={t('fields.description')} optional className="col-span-2 lg:col-span-3">
                                <input name="description" className={adminInputClass()} />
                            </AdminField>
                        </div>
                    </AdminSection>

                    <AdminSection title={t('plans.sections.limits')}>
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                            {scope === 'EVENT' ? (
                                <>
                                    <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_6rem] gap-2 lg:col-span-2">
                                        <AdminField label={t('fields.storage')} optional>
                                            <input name="storageAmount" type="number" min={0} step="0.01" placeholder={t('fields.blankUnlimited')} className={adminInputClass('max-w-32')} />
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
                                    <AdminField label={t('fields.maxMembers')} optional className="col-span-1 lg:col-span-1">
                                        <input name="maxMembers" type="number" min={0} placeholder={t('fields.blankUnlimited')} className={adminInputClass('max-w-28')} />
                                    </AdminField>
                                </>
                            ) : (
                                <AdminField label={t('fields.maxEventsPerUser')} optional className="col-span-2 lg:col-span-3">
                                    <input name="maxActiveEvents" type="number" min={0} placeholder={t('fields.blankUnlimited')} className={adminInputClass('max-w-28')} />
                                </AdminField>
                            )}
                        </div>
                    </AdminSection>

                    <AdminSection title={t('plans.sections.pricing')}>
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                            <AdminField label={t('fields.price')} optional className="col-span-1 lg:col-span-2">
                                <input name="price" type="number" min={0} step="0.01" placeholder="499" className={adminInputClass('max-w-32')} />
                            </AdminField>
                            <AdminField label={t('fields.priceCurrency')} optional className="col-span-1">
                                <input name="priceCurrency" maxLength={3} placeholder="EUR" className={adminInputClass('max-w-20')} />
                            </AdminField>
                            <AdminField label={t('fields.billingPeriod')} optional className="col-span-2 lg:col-span-2">
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
                                    <AdminField label={t('fields.recurringPrice')} optional className="col-span-1 lg:col-span-2">
                                        <input name="recurringPrice" type="number" min={0} step="0.01" placeholder="15" className={adminInputClass('max-w-32')} />
                                    </AdminField>
                                    <AdminField label={t('fields.includedMonths')} optional className="col-span-1">
                                        <input name="includedMonths" type="number" min={0} placeholder="3" className={adminInputClass('max-w-24')} />
                                    </AdminField>
                                </>
                            )}
                            <AdminField label={t('fields.discountPercent')} optional className="col-span-1">
                                <input name="discountPercent" type="number" min={0} max={100} className={adminInputClass('max-w-24')} />
                            </AdminField>
                        </div>
                    </AdminSection>

                    <AdminSection title={t('plans.sections.availability')}>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <AdminSwitch name="isDefault" label={t('fields.isDefault')} description={t('fields.isDefaultHint')} />
                            <AdminSwitch name="isAssignable" label={t('fields.isAssignable')} description={t('fields.isAssignableHint')} defaultChecked />
                            <AdminSwitch name="isPublic" label={t('fields.isPublic')} description={t('fields.isPublicHint')} defaultChecked />
                        </div>
                    </AdminSection>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-border bg-surface-muted/45 px-4 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-bold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={createPlan.isPending}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,31,26,0.14)] transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:opacity-50"
                        >
                            {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t('plans.create.submit')}
                        </button>
                    </div>
                    {createPlan.error && <p className="text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(createPlan.error)}`)}</p>}
                </form>
            </Modal.Body>
        </Modal>
    );
}
