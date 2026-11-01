'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminLimitControl } from '@/components/admin/AdminLimitControl';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { PlanModuleStorageField } from '@/components/admin/plans/PlanModuleStorageField';
import { PlanModuleTypesField } from '@/components/admin/plans/PlanModuleTypesField';
import type { PartnerRole } from '@/lib/api/types';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigField({
    field,
    value,
    limited,
    error,
    onLimitModeChangeAction,
    onLimitValueChangeAction,
    onSwitchChangeAction,
    onTypeChangeAction,
}: {
    field: KnownConfigField;
    value: string;
    limited: boolean;
    error?: string;
    onLimitModeChangeAction: (key: string, limited: boolean) => void;
    onLimitValueChangeAction: (key: string, value: string) => void;
    onSwitchChangeAction: (key: string, checked: boolean) => void;
    onTypeChangeAction: (key: string, role: PartnerRole, checked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    function handleModeChange(next: boolean) {
        onLimitModeChangeAction(field.key, next);
    }

    function handleValueChange(next: string) {
        onLimitValueChangeAction(field.key, next);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        onLimitValueChangeAction(field.key, event.currentTarget.value);
    }

    function handleSwitchChange(next: boolean) {
        onSwitchChangeAction(field.key, next);
    }

    function handleTypeChange(role: PartnerRole, checked: boolean) {
        onTypeChangeAction(field.key, role, checked);
    }

    if (field.type === 'types') {
        return <PlanModuleTypesField label={t(`fields.${field.key}`)} value={value} onChangeAction={handleTypeChange} />;
    }

    if (field.type === 'boolean') {
        return (
            <div className="rounded-lg border border-border">
                <AdminSwitch
                    label={t(`fields.${field.key}`)}
                    description={field.hint ? t(`fieldHints.${field.key}`) : undefined}
                    checked={value === 'true'}
                    onCheckedChangeAction={handleSwitchChange}
                />
            </div>
        );
    }

    if (field.storage) {
        return <PlanModuleStorageField label={t(`fields.${field.key}`)} value={value} error={error} onChangeAction={handleValueChange} />;
    }

    if (field.required) {
        // A number the server always needs: no "Unlimited", just the value.
        return (
            <AdminField label={t(`fields.${field.key}`)} hint={error}>
                <input
                    type="number"
                    inputMode="numeric"
                    min={field.min ?? 0}
                    max={field.max}
                    step={1}
                    value={value}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(error)}
                    className={adminInputClass('font-mono')}
                />
            </AdminField>
        );
    }

    return (
        <AdminLimitControl
            label={t(`fields.${field.key}`)}
            limited={limited}
            value={value}
            min={field.min ?? 0}
            error={error}
            unlimitedLabel={t('unlimited')}
            upToLabel={t('upTo')}
            onModeChangeAction={handleModeChange}
            onValueChangeAction={handleValueChange}
        />
    );
}
