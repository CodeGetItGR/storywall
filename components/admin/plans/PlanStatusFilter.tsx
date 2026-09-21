'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { PlanStatusFilterValue } from '@/hooks/usePlansSection';
import { cn } from '@/lib/utils';

const FILTERS: PlanStatusFilterValue[] = ['ALL', 'LIVE', 'HIDDEN', 'ARCHIVED'];

export function PlanStatusFilter({
    value,
    counts,
    onChangeAction,
}: {
    value: PlanStatusFilterValue;
    counts: Record<PlanStatusFilterValue, number>;
    onChangeAction: (next: PlanStatusFilterValue) => void;
}) {
    const t = useTranslations('AdminPage.plans');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.status as PlanStatusFilterValue);
    }

    return (
        <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
            {FILTERS.map((status) => (
                <button
                    key={status}
                    type="button"
                    data-status={status}
                    onClick={handleClick}
                    aria-pressed={value === status}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                        value === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                    )}
                >
                    {t(`status.${status}`)}
                    <span className="font-mono text-[11px] font-semibold text-ink-faint">{counts[status]}</span>
                </button>
            ))}
        </div>
    );
}
