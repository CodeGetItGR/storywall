'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { STORAGE_UNITS, storageBytesToInput } from '@/lib/adminPlanForm';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorLimitsSection({ id, plan }: { id: string; plan: PlanTierResponseDto }) {
    const t = useTranslations('AdminPage');
    const storageInput = storageBytesToInput(plan.storageBytes);

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Limits */}
            <h4 className="mb-1 text-sm font-bold text-ink">{t('plans.sections.limits')}</h4>
            <p className="mb-4 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.limitsHint')}</p>
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-3">
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
                <AdminField label={t('fields.autoDeleteMonths')} optional hint={t('fields.autoDeleteMonthsHint')} className="col-span-3">
                    <input
                        name="autoDeleteMonths"
                        type="number"
                        min={1}
                        defaultValue={plan.autoDeleteMonths ?? ''}
                        placeholder={t('fields.blankUnlimited')}
                        className={adminInputClass('max-w-28')}
                    />
                </AdminField>
            </div>
        </section>
    );
}
