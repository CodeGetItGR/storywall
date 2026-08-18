'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminTabPanel } from '@/components/admin/AdminTabs';
import { defaultCurrency, instantToLocalInput, priceMinorToInput } from '@/lib/adminPlanForm';
import type { BillingPeriod, PlanTierResponseDto } from '@/lib/api/types';

const BILLING_PERIODS: BillingPeriod[] = ['MONTHLY', 'YEARLY', 'ONE_TIME'];

export function PlanEditorPricingTab({
    editorId,
    activeTab,
    plan,
    isEvent,
}: {
    editorId: string;
    activeTab: string;
    plan: PlanTierResponseDto;
    isEvent: boolean;
}) {
    const t = useTranslations('AdminPage');

    return (
        <AdminTabPanel id={editorId} tabKey="pricing" active={activeTab} className="pt-5">
            {/* Pricing */}
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

            {/* Promotion */}
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
    );
}
