'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import type { CalendarDaySummaryDto, CalendarSummaryResponseDto } from '@/lib/api/types';
import { calendarLoadTier, calendarMonthDays, utcDateKey } from '@/lib/costTracking';
import { formatBytes, formatCount } from '@/lib/format';

const LOAD_COLORS = {
    empty: 'bg-canvas text-ink-faint',
    low: 'bg-sky-50 text-sky-950 ring-1 ring-inset ring-sky-200',
    medium: 'bg-cyan-100 text-cyan-950 ring-1 ring-inset ring-cyan-300',
    high: 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-300',
    peak: 'bg-status-danger-wash text-status-danger ring-1 ring-inset ring-status-danger/30',
} as const;

export function CostTrackingCalendar({
    calendar,
    error,
    isLoading,
    month,
    onChangeMonthAction,
    onOpenDayAction,
}: {
    calendar: CalendarSummaryResponseDto | undefined;
    error: unknown;
    isLoading: boolean;
    month: Date;
    onChangeMonthAction: (offset: number) => void;
    onOpenDayAction: (date: string) => void;
}) {
    const locale = useLocale();
    const t = useTranslations('AdminPage.costTracking.calendar');
    const days = calendarMonthDays(month);
    const summaries = new Map(calendar?.days.map((day) => [utcDateKey(day.date), day]));
    const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month);
    const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

    function handleMonthChange(event: MouseEvent<HTMLButtonElement>) {
        onChangeMonthAction(Number(event.currentTarget.dataset.offset));
    }

    return (
        <div>
            {/* Calendar toolbar */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    data-offset="-1"
                    aria-label={t('previousMonth')}
                    title={t('previousMonth')}
                    onClick={handleMonthChange}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-bold text-ink">{monthLabel}</p>
                <button
                    type="button"
                    data-offset="1"
                    aria-label={t('nextMonth')}
                    title={t('nextMonth')}
                    onClick={handleMonthChange}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-ink-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Load legend */}
            {calendar && <CalendarLegend thresholds={calendar.thresholds} />}

            {isLoading ? (
                <LoadingState label={t('loading')} className="justify-start py-8" />
            ) : error ? (
                <p className="py-8 text-sm text-status-danger">{t('error')}</p>
            ) : (
                <div className="overflow-x-auto pb-1">
                    <div className="min-w-[720px]">
                        {/* Weekday headings */}
                        <div className="grid grid-cols-7 gap-px pb-1 text-center text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            {days.slice(0, 7).map((day) => (
                                <span key={utcDateKey(day)}>{weekdayFormatter.format(day)}</span>
                            ))}
                        </div>
                        {/* Calendar days */}
                        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                            {days.map((day) => {
                                const date = utcDateKey(day);
                                const summary = summaries.get(date);
                                const isCurrentMonth = day.getUTCMonth() === month.getUTCMonth();
                                return (
                                    <CalendarDay
                                        key={date}
                                        date={day}
                                        isCurrentMonth={isCurrentMonth}
                                        summary={summary}
                                        thresholds={calendar?.thresholds}
                                        onOpenAction={onOpenDayAction}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CalendarLegend({ thresholds }: { thresholds: CalendarSummaryResponseDto['thresholds'] }) {
    const t = useTranslations('AdminPage.costTracking.calendar');
    const tiers = [
        { key: 'low', label: t('legend.low', { max: thresholds.lowMax }) },
        { key: 'medium', label: t('legend.medium', { min: thresholds.lowMax + 1, max: thresholds.mediumMax }) },
        { key: 'high', label: t('legend.high', { min: thresholds.mediumMax + 1, max: thresholds.highMax }) },
        { key: 'peak', label: t('legend.peak', { min: thresholds.highMax + 1 }) },
    ] as const;

    return (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">{t('legend.label')}</span>
            {tiers.map(({ key, label }) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${LOAD_COLORS[key]}`} />
                    {label}
                </span>
            ))}
        </div>
    );
}

function CalendarDay({
    date,
    isCurrentMonth,
    summary,
    thresholds,
    onOpenAction,
}: {
    date: Date;
    isCurrentMonth: boolean;
    summary: CalendarDaySummaryDto | undefined;
    thresholds: CalendarSummaryResponseDto['thresholds'] | undefined;
    onOpenAction: (date: string) => void;
}) {
    const locale = useLocale();
    const t = useTranslations('AdminPage.costTracking.calendar');
    const dateKey = utcDateKey(date);
    const eventCount = summary?.eventCount ?? 0;
    const tier = thresholds ? calendarLoadTier(eventCount, thresholds) : 'empty';
    const dayLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(date);
    const ariaLabel = eventCount === 0 ? t('dayEmpty', { date: dateKey }) : t('openDay', { date: dateKey, count: eventCount });

    function handleOpenDay(event: MouseEvent<HTMLButtonElement>) {
        onOpenAction(event.currentTarget.dataset.date!);
    }

    return (
        <button
            type="button"
            data-date={dateKey}
            disabled={!summary}
            aria-label={ariaLabel}
            onClick={handleOpenDay}
            className={`min-h-32 p-2 text-left transition focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-default ${
                isCurrentMonth ? LOAD_COLORS[tier] : 'bg-canvas/70 text-ink-faint'
            } ${summary ? 'hover:brightness-[0.97]' : ''}`}
        >
            <span className="font-mono text-[11px] font-bold tabular-nums">{dayLabel}</span>
            {summary && (
                <span className="mt-3 block">
                    <strong className="block font-mono text-sm font-extrabold tabular-nums">
                        {t('eventCount', { count: formatCount(eventCount) })}
                    </strong>
                    <span className="mt-1 block truncate text-[11px] font-semibold tracking-wide uppercase">{formatPlanMix(summary.planMix)}</span>
                    <span className="mt-2 block text-[11px] leading-4 opacity-80">
                        {t('quotaSummary', {
                            storage: quotaValue(summary.storageBytesTotal, summary.hasUnlimitedStorageQuota, formatBytes),
                            guests: quotaValue(summary.guestCapTotal, summary.hasUnlimitedGuestCap, formatCount),
                        })}
                    </span>
                </span>
            )}
        </button>
    );
}

function formatPlanMix(planMix: Record<string, number>): string {
    return Object.entries(planMix)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([plan, count]) => `${plan} ${count}`)
        .join(' · ');
}

function quotaValue(value: number, hasUnlimitedQuota: boolean, formatter: (value: number) => string): string {
    return `${hasUnlimitedQuota ? '≥ ' : ''}${formatter(value)}`;
}
