'use client';

import { PlanModuleConfigField } from '@/components/admin/plans/PlanModuleConfigField';
import type { PartnerRole } from '@/lib/api/types';
import type { KnownConfigField } from '@/lib/planModuleConfig';

export function PlanModuleConfigFields({
    fields,
    draft,
    limitedKeys,
    errors,
    onLimitModeChangeAction,
    onLimitValueChangeAction,
    onSwitchChangeAction,
    onTypeChangeAction,
}: {
    fields: KnownConfigField[];
    draft: Record<string, string>;
    limitedKeys: string[];
    errors: Record<string, string>;
    onLimitModeChangeAction: (key: string, limited: boolean) => void;
    onLimitValueChangeAction: (key: string, value: string) => void;
    onSwitchChangeAction: (key: string, checked: boolean) => void;
    onTypeChangeAction: (key: string, role: PartnerRole, checked: boolean) => void;
}) {
    if (fields.length === 0) return null;

    return (
        <div className="space-y-3">
            {fields.map((field) => (
                <PlanModuleConfigField
                    key={field.key}
                    field={field}
                    value={draft[field.key] ?? ''}
                    limited={limitedKeys.includes(field.key)}
                    error={errors[field.key]}
                    onLimitModeChangeAction={onLimitModeChangeAction}
                    onLimitValueChangeAction={onLimitValueChangeAction}
                    onSwitchChangeAction={onSwitchChangeAction}
                    onTypeChangeAction={onTypeChangeAction}
                />
            ))}
        </div>
    );
}
