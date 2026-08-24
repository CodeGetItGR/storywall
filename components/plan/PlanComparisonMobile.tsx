'use client';

import { type ReactNode } from 'react';

import { PlanComparisonBadges } from '@/components/plan/PlanComparisonBadges';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export type ComparisonRow = {
    key: string;
    label: ReactNode;
    action?: ReactNode;
    render: (plan: PlanTierResponseDto) => ReactNode;
};

export function PlanComparisonMobile({
    plans,
    rows,
    currentPlanCode,
    nextPlanId,
}: {
    plans: PlanTierResponseDto[];
    rows: ComparisonRow[];
    currentPlanCode?: string | null;
    nextPlanId?: string | null;
}) {
    const localizedPlanDescription = useLocalizedPlanDescription();

    return (
        <div className="divide-y divide-border">
            {plans.map((plan) => (
                <section key={plan.id} className={cn('py-5', Boolean(currentPlanCode) && plan.code === currentPlanCode && 'bg-primary-light/10')}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                            <p className="mt-1 text-sm leading-6 text-ink-muted">{localizedPlanDescription(plan)}</p>
                        </div>
                        <PlanComparisonBadges isCurrent={Boolean(currentPlanCode) && plan.code === currentPlanCode} />
                    </div>

                    <dl className="mt-4 divide-y divide-border">
                        {rows.map((row) => (
                            <div key={row.key} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-3">
                                <dt className="flex min-w-0 items-start justify-between gap-2 text-sm font-semibold text-ink">
                                    <span className="min-w-0">{row.label}</span>
                                    {row.action ? <span className="shrink-0">{row.action}</span> : null}
                                </dt>
                                <dd className="min-w-0 text-sm leading-6 text-ink-muted">{row.render(plan)}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
