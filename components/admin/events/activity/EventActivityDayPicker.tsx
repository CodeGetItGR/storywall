'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { wallClockDate } from '@/lib/adminEventActivity';
import { formatDate } from '@/lib/datetime';

const ARROW = 'rounded-md p-1 text-ink-muted hover:bg-card hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

// Steps through the days that had activity, one at a time.
export function EventActivityDayPicker({
    day,
    canGoBack,
    canGoForward,
    onPreviousAction,
    onNextAction,
}: {
    day: string;
    canGoBack: boolean;
    canGoForward: boolean;
    onPreviousAction: () => void;
    onNextAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.activity.hourly');
    const locale = useLocale();
    const label = formatDate(locale, wallClockDate(day), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    return (
        <div className="flex items-center gap-2 text-sm">
            <button type="button" className={ARROW} onClick={onPreviousAction} disabled={!canGoBack} aria-label={t('previous')}>
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-24 text-center font-semibold text-ink tabular-nums">{label}</span>
            <button type="button" className={ARROW} onClick={onNextAction} disabled={!canGoForward} aria-label={t('next')}>
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
        </div>
    );
}
