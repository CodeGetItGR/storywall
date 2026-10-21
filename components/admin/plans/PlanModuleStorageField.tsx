'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { STORAGE_UNITS, type StorageUnit } from '@/lib/adminPlanForm';
import { splitStorageDraft, storageDraft } from '@/lib/planModuleConfig';

// A storage size typed as an amount and an MB/GB/TB unit; the draft carries both.
export function PlanModuleStorageField({
    label,
    value,
    error,
    onChangeAction,
}: {
    label: string;
    value: string;
    error?: string;
    onChangeAction: (value: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const { amount, unit } = splitStorageDraft(value);

    function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
        onChangeAction(storageDraft(event.currentTarget.value, unit));
    }

    function handleUnitChange(event: ChangeEvent<HTMLSelectElement>) {
        onChangeAction(storageDraft(amount, event.currentTarget.value as StorageUnit));
    }

    return (
        <AdminField label={label} hint={error}>
            <div className="flex gap-2">
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={handleAmountChange}
                    aria-invalid={Boolean(error)}
                    className={adminInputClass('w-full font-mono')}
                />
                <select value={unit} onChange={handleUnitChange} aria-label={t('fields.unit')} className={adminInputClass('w-24 shrink-0')}>
                    {STORAGE_UNITS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
        </AdminField>
    );
}
