'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEventHandler } from 'react';

import type { CoverageOptionResponseDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

export function PlanDurationRow({
    option,
    currency,
    onEditAction,
}: {
    option: CoverageOptionResponseDto;
    currency: string | null;
    onEditAction: MouseEventHandler<HTMLButtonElement>;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const monthsLabel = t('plans.columns.months', { count: option.months });

    return (
        <div className="flex min-h-11 items-center gap-3 px-3 py-2">
            {/* Duration */}
            <span className={cn('w-24 shrink-0 text-sm font-semibold', option.active ? 'text-ink' : 'text-ink-faint')}>{monthsLabel}</span>
            <span className={cn('font-mono text-sm', option.active ? 'text-ink' : 'text-ink-faint')}>
                {formatOptionalMoney(option.priceAmountMinor, currency, locale)}
            </span>

            {/* Status */}
            <span
                className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    option.active ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
                )}
            >
                <span className={cn('h-1.5 w-1.5 rounded-full', option.active ? 'bg-status-good' : 'bg-status-neutral')} />
                {option.active ? t('plans.durations.live') : t('plans.durations.retired')}
            </span>

            {/* Edit */}
            <button
                type="button"
                data-option-id={option.id}
                onClick={onEditAction}
                aria-label={t('plans.durations.edit', { duration: monthsLabel })}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
            >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}
