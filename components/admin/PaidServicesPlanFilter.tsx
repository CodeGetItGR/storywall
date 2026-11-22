'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import type { LabeledExtensionPlanGroup } from '@/hooks/useExtensionPlanGroups';

// Narrows the Paid services table to one plan: its extensions and the services
// its hosts can buy. Plans are grouped by event type, each shown with its code.
export function PaidServicesPlanFilter({
    groups,
    value,
    onChangeAction,
}: {
    groups: LabeledExtensionPlanGroup[];
    value: string;
    onChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
    const t = useTranslations('AdminPage.paidServices');

    return (
        <select value={value} onChange={onChangeAction} aria-label={t('columns.plans')} className={adminInputClass('w-auto max-w-64')}>
            <option value="">{t('allPlans')}</option>
            {groups.map((group) => (
                <optgroup key={group.eventTypeKey} label={group.label || group.eventTypeKey}>
                    {group.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                            {plan.name} · {plan.code}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}
