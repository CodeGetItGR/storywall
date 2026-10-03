'use client';

import { useTranslations } from 'next-intl';

import { AdminLimitControl } from '@/components/admin/AdminLimitControl';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigField({
    field,
    value,
    limited,
    error,
    onLimitModeChangeAction,
    onLimitValueChangeAction,
    onSwitchChangeAction,
}: {
    field: KnownConfigField;
    value: string;
    limited: boolean;
    error?: string;
    onLimitModeChangeAction: (key: string, limited: boolean) => void;
    onLimitValueChangeAction: (key: string, value: string) => void;
    onSwitchChangeAction: (key: string, checked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.plans.grid.cell');

    function handleModeChange(next: boolean) {
        onLimitModeChangeAction(field.key, next);
    }

    function handleValueChange(next: string) {
        onLimitValueChangeAction(field.key, next);
    }

    function handleSwitchChange(next: boolean) {
        onSwitchChangeAction(field.key, next);
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
