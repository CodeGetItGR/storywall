'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { type CostTrackingRange } from '@/lib/costTracking';
import { cn } from '@/lib/utils';

export function CostTrackingRangeControl({
    range,
    onChangeAction,
}: {
    range: CostTrackingRange;
    onChangeAction: (range: CostTrackingRange) => void;
}) {
    const t = useTranslations('AdminPage.costTracking');

    function handleRangeClick(event: MouseEvent<HTMLButtonElement>) {
        const nextRange = event.currentTarget.dataset.range as CostTrackingRange | undefined;
        if (nextRange) onChangeAction(nextRange);
    }

    return (
        <div className="inline-flex rounded-lg border border-border bg-card p-1" aria-label={t('range.label')}>
            {(['WEEK', 'MONTH'] as const).map((option) => {
                const active = option === range;
                return (
                    <button
                        key={option}
                        type="button"
                        data-range={option}
                        aria-pressed={active}
                        onClick={handleRangeClick}
                        className={cn(
                            'min-h-9 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            active ? 'bg-primary text-primary-foreground' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                        )}
                    >
                        {t(`range.${option}`)}
                    </button>
                );
            })}
        </div>
    );
}
