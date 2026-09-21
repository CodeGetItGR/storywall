'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigFields({
    fields,
    draft,
    errors,
    onChangeAction,
}: {
    fields: KnownConfigField[];
    draft: Record<string, string>;
    errors: Record<string, string>;
    onChangeAction: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    if (fields.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => (
                <AdminField key={field.key} label={field.key} hint={errors[field.key]}>
                    {field.type === 'boolean' ? (
                        <select name={field.key} value={draft[field.key] ?? ''} onChange={onChangeAction} className={adminInputClass('font-mono')}>
                            <option value="">—</option>
                            <option value="true">{t('yes')}</option>
                            <option value="false">{t('no')}</option>
                        </select>
                    ) : (
                        <input
                            name={field.key}
                            type="number"
                            min={field.min}
                            step={1}
                            value={draft[field.key] ?? ''}
                            onChange={onChangeAction}
                            aria-invalid={Boolean(errors[field.key])}
                            className={adminInputClass('font-mono')}
                        />
                    )}
                </AdminField>
            ))}
        </div>
    );
}
