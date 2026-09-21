'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { defaultCurrency, instantToLocalInput, priceMinorToInput } from '@/lib/adminPlanForm';
import type { BillingPeriod, PlanTierResponseDto } from '@/lib/api/types';

const BILLING_PERIODS: BillingPeriod[] = ['ONE_TIME'];

export function PlanEditorPricingSection({ id, plan }: { id: string; plan: PlanTierResponseDto }) {
    const t = useTranslations('AdminPage');

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Pricing */}
            <h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.pricing')}</h4>
            <div className="grid grid-cols-2 gap-3">
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
                <AdminField label={t('fields.billingPeriod')} optional className="col-span-2">
                    <select name="billingPeriod" defaultValue={plan.billingPeriod ?? ''} className={adminInputClass('max-w-44')}>
                        <option value="">{t('none')}</option>
                        {BILLING_PERIODS.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </AdminField>
            </div>

            {/* Promotion */}
            <AdminSection title={t('plans.sections.promotion')} description={t('plans.sections.promotionHint')} className="mt-1">
                <div className="grid grid-cols-2 gap-3">
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
                    <AdminField label={t('fields.discountLabel')} optional>
                        <input
                            name="discountLabel"
                            maxLength={100}
                            defaultValue={plan.discountLabel ?? ''}
                            placeholder={t('none')}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('fields.discountStartsAt')} optional hint={t('fields.discountBoundHint')}>
                        <input
                            name="discountStartsAt"
                            type="datetime-local"
                            defaultValue={instantToLocalInput(plan.discountStartsAt)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('fields.discountEndsAt')} optional hint={t('fields.discountEndsAtHint')}>
                        <input
                            name="discountEndsAt"
                            type="datetime-local"
                            defaultValue={instantToLocalInput(plan.discountEndsAt)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                </div>
            </AdminSection>
        </section>
    );
}
