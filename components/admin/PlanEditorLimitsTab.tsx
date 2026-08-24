'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminTabPanel } from '@/components/admin/AdminTabs';
import { STORAGE_UNITS, storageBytesToInput } from '@/lib/adminPlanForm';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorLimitsTab({
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
    const storageInput = storageBytesToInput(plan.storageBytes);

    return (
        <AdminTabPanel id={editorId} tabKey="limits" active={activeTab} className="pt-5">
            {/* Limits */}
            <p className="mb-4 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.limitsHint')}</p>
            {isEvent ? (
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
                </div>
            ) : (
                /* Account quotas */
                <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-ink-muted">{t('plans.accountNoQuotas')}</p>
            )}
        </AdminTabPanel>
    );
}
