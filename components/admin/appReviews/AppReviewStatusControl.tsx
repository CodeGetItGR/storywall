'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { AppReviewStatus } from '@/lib/api/types';
import { APP_REVIEW_STATUSES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

export function AppReviewStatusControl({
    value,
    disabled,
    onChangeAction,
}: {
    value: AppReviewStatus;
    disabled: boolean;
    onChangeAction: (status: AppReviewStatus) => void;
}) {
    const t = useTranslations('AdminPage.appReviews');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const next = event.currentTarget.dataset.status as AppReviewStatus;
        if (next !== value) onChangeAction(next);
    }

    return (
        <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('statusTitle')}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {APP_REVIEW_STATUSES.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-status={option}
                        onClick={handleClick}
                        disabled={disabled}
                        aria-pressed={value === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed',
                            value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`status.${option}`)}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`statusHint.${value}`)}</p>
        </div>
    );
}
