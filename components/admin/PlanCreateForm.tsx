'use client';

import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useMemo, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { useCreatePlanTier } from '@/hooks/useAdmin';
import { priceInputToMinor, STORAGE_UNITS, storageInputToBytes } from '@/lib/adminPlanForm';
import { adminErrorMessageKey, checked, emptyToNull, numberOrNull } from '@/lib/adminUtils';
import type { BillingPeriod, PlanScope, PlanTierRequestDto, PlanTierResponseDto } from '@/lib/api/types';

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'YEARLY', 'ONE_TIME'];

export function PlanCreateForm({ plans, scope }: { plans: PlanTierResponseDto[]; scope: PlanScope }) {
    const t = useTranslations('AdminPage');
    const createPlan = useCreatePlanTier();
    const [isExpanded, setIsExpanded] = useState(false);
    const nextSortOrder = useMemo(() => Math.max(-1, ...plans.map((plan) => plan.sortOrder)) + 1, [plans]);

    function handleToggleExpanded() {
        setIsExpanded((current) => !current);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
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
            discountPercent: numberOrNull(formData.get('discountPercent')),
            discountLabel: emptyToNull(formData.get('discountLabel')),
            discountStartsAt: emptyToNull(formData.get('discountStartsAt')),
            discountEndsAt: emptyToNull(formData.get('discountEndsAt')),
        };

        createPlan.mutate(input, {
            onSuccess: () => {
                form.reset();
                setIsExpanded(false);
            },
        });
    }

    return (
        <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-ink">{t('plans.create.title')}</h2>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{scope}</span>
                    </div>
                    <p className="text-sm text-ink-muted">{t('plans.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={handleToggleExpanded}
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4 rotate-180" /> : <Plus className="h-4 w-4" />}
                    {isExpanded ? t('collapse') : t('plans.create.open')}
                </button>
            </div>

            {isExpanded && (
                <form onSubmit={handleSubmit} className="border-t border-border p-3 sm:p-4">
                    <div className="space-y-1">
                        <AdminSection title={t('plans.sections.identity')}>
                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                                <AdminField label={t('fields.code')} className="col-span-2 lg:col-span-2">
                                    <input
                                        required
                                        name="code"
                                        placeholder="ENTERPRISE"
                                        pattern="[A-Z0-9_]+"
                                        maxLength={30}
                                        className={adminInputClass()}
                                    />
                                </AdminField>
                                <AdminField label={t('fields.name')} className="col-span-2 lg:col-span-2">
                                    <input required name="name" maxLength={100} className={adminInputClass()} />
                                </AdminField>
                                <AdminField label={t('fields.sort')} className="col-span-1 lg:col-span-1">
                                    <input
                                        required
                                        name="sortOrder"
                                        type="number"
                                        min={0}
                                        value={nextSortOrder}
                                        readOnly
                                        className={adminInputClass('max-w-[6rem]')}
                                    />
                                </AdminField>
                                <AdminField label={t('fields.description')} className="col-span-2 lg:col-span-3">
                                    <input name="description" className={adminInputClass()} />
                                </AdminField>
                            </div>
                        </AdminSection>

                        <AdminSection title={t('plans.sections.limits')}>
                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                                {scope === 'EVENT' ? (
                                    <>
                                        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_6rem] gap-2 lg:col-span-2">
                                            <AdminField label={t('fields.storage')}>
                                                <input
                                                    name="storageAmount"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    placeholder={t('fields.blankUnlimited')}
                                                    className={adminInputClass('max-w-[8rem]')}
                                                />
                                            </AdminField>
                                            <AdminField label={t('fields.unit')}>
                                                <select name="storageUnit" defaultValue="GB" className={adminInputClass('max-w-[5rem]')}>
                                                    {STORAGE_UNITS.map((unit) => (
                                                        <option key={unit} value={unit}>
                                                            {unit}
                                                        </option>
                                                    ))}
                                                </select>
                                            </AdminField>
                                        </div>
                                        <AdminField label={t('fields.maxMembers')} className="col-span-1 lg:col-span-1">
                                            <input
                                                name="maxMembers"
                                                type="number"
                                                min={0}
                                                placeholder={t('fields.blankUnlimited')}
                                                className={adminInputClass('max-w-[7rem]')}
                                            />
                                        </AdminField>
                                    </>
                                ) : (
                                    <AdminField label={t('fields.maxActiveEvents')} className="col-span-2 lg:col-span-3">
                                        <input
                                            name="maxActiveEvents"
                                            type="number"
                                            min={0}
                                            placeholder={t('fields.blankUnlimited')}
                                            className={adminInputClass('max-w-[7rem]')}
                                        />
                                    </AdminField>
                                )}
                            </div>
                        </AdminSection>

                        <AdminSection title={t('plans.sections.pricing')}>
                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
                                <AdminField label={t('fields.price')} className="col-span-1 lg:col-span-2">
                                    <input
                                        name="price"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="499"
                                        className={adminInputClass('max-w-[8rem]')}
                                    />
                                </AdminField>
                                <AdminField label={t('fields.priceCurrency')} className="col-span-1">
                                    <input name="priceCurrency" maxLength={3} placeholder="EUR" className={adminInputClass('max-w-[5rem]')} />
                                </AdminField>
                                <AdminField label={t('fields.billingPeriod')} className="col-span-2 lg:col-span-2">
                                    <select name="billingPeriod" className={adminInputClass('max-w-[10rem]')}>
                                        <option value="">{t('none')}</option>
                                        {BILLING_PERIODS.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </AdminField>
                                <AdminField label={t('fields.discountPercent')} className="col-span-1">
                                    <input name="discountPercent" type="number" min={0} max={100} className={adminInputClass('max-w-[6rem]')} />
                                </AdminField>
                            </div>
                        </AdminSection>

                        <AdminSection title={t('plans.sections.availability')}>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <AdminSwitch name="isDefault" label={t('fields.isDefault')} description={t('fields.isDefaultHint')} />
                                <AdminSwitch
                                    name="isAssignable"
                                    label={t('fields.isAssignable')}
                                    description={t('fields.isAssignableHint')}
                                    defaultChecked
                                />
                                <AdminSwitch name="isPublic" label={t('fields.isPublic')} description={t('fields.isPublicHint')} defaultChecked />
                            </div>
                        </AdminSection>
                    </div>

                    <div className="mt-3 flex justify-end">
                        <button
                            type="submit"
                            disabled={createPlan.isPending}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50"
                        >
                            {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {t('plans.create.submit')}
                        </button>
                    </div>
                    {createPlan.error && <p className="mt-3 text-sm text-rose-600">{t(`errors.${adminErrorMessageKey(createPlan.error)}`)}</p>}
                </form>
            )}
        </section>
    );
}
