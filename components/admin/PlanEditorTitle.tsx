'use client';

import { useTranslations } from 'next-intl';

import type { PlanTierResponseDto } from '@/lib/api/types';

// The plan editor modal's title: the name plus its Default/Archived badges.
export function PlanEditorTitle({ plan }: { plan: PlanTierResponseDto }) {
    const t = useTranslations('AdminPage');

    return (
        <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{plan.name}</span>
            {plan.isDefault && (
                <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold tracking-normal text-primary-dark">
                    {t('plans.default')}
                </span>
            )}
            {!plan.isAssignable && (
                <span className="shrink-0 rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-semibold tracking-normal text-status-warn">
                    {t('plans.archived')}
                </span>
            )}
        </span>
    );
}
