'use client';

import { type ReactNode } from 'react';

import { PlanComparisonBadges } from '@/components/plan/PlanComparisonBadges';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export type MatrixRow = {
    key: string;
    label: ReactNode;
    action?: ReactNode;
    render: (plan: PlanTierResponseDto) => ReactNode;
};

export function PlanComparisonMatrix({
    plans,
    rows,
    currentPlanCode,
    nextPlanId,
    fieldLabel,
}: {
    plans: PlanTierResponseDto[];
    rows: MatrixRow[];
    currentPlanCode?: string | null;
    nextPlanId?: string | null;
    fieldLabel: ReactNode;
}) {
    const localizedPlanDescription = useLocalizedPlanDescription();
    const gridTemplateColumns = `12rem repeat(${plans.length}, minmax(12rem, 1fr))`;

    return (
        <div className="overflow-x-auto border-y border-border">
            <div className="min-w-230">
                <div
                    className="grid gap-4 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
                    style={{ gridTemplateColumns }}
                >
                    <div>{fieldLabel}</div>
                    {plans.map((plan) => (
                        <div key={plan.id} className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-sm font-semibold normal-case tracking-normal text-ink">{plan.name}</span>
                                <PlanComparisonBadges
                                    isCurrent={Boolean(currentPlanCode) && plan.code === currentPlanCode}
                                    isNext={nextPlanId === plan.id}
                                />
                            </div>
                            <p className="mt-1 text-xs font-normal normal-case leading-5 tracking-normal text-ink-muted">
                                {localizedPlanDescription(plan)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="divide-y divide-border">
                    {rows.map((row) => (
                        <div key={row.key} className="grid gap-4 px-4 py-4" style={{ gridTemplateColumns }}>
                            <div className="flex min-w-0 items-start justify-between gap-3 text-sm font-semibold text-ink">
                                <span className="min-w-0">{row.label}</span>
                                {row.action ? <span className="shrink-0">{row.action}</span> : null}
                            </div>
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        'min-w-0 rounded-md px-2 py-1 text-sm leading-6 text-ink-muted',
                                        Boolean(currentPlanCode) && plan.code === currentPlanCode && 'bg-primary-light/20 text-ink',
                                        nextPlanId === plan.id && 'bg-surface-muted/70'
                                    )}
                                >
                                    {row.render(plan)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
