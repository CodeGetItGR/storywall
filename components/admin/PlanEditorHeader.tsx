'use client';

import { useTranslations } from 'next-intl';

import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorHeader({ plan }: { plan: PlanTierResponseDto }) {
    const t = useTranslations('AdminPage');

    return (
        <header className="pb-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-2xl font-bold tracking-tight text-ink">{plan.name}</h3>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-muted">{plan.code}</span>
                {plan.isDefault && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                        {t('plans.default')}
                    </span>
                )}
                {!plan.isAssignable && (
                    <span className="rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-semibold text-status-warn">
                        {t('plans.archived')}
                    </span>
                )}
            </div>
        </header>
    );
}
