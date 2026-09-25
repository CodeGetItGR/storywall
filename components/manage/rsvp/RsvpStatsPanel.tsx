'use client';

import { CalendarClock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { LoadingState } from '@/components/ui/LoadingState';
import { useRsvpReport } from '@/hooks/useRsvps';
import { formatDate, getDaysUntil } from '@/lib/datetime';

import { RsvpDeadlineField } from './RsvpDeadlineField';
import { RsvpReportCategories } from './RsvpReportCategories';
import { RsvpReportSessions } from './RsvpReportSessions';
import { RsvpReportTiles } from './RsvpReportTiles';

export function RsvpStatsPanel({
    eventId,
    canWrite,
    rsvpDeadline,
    countdownTarget,
    isRsvpDeadline,
}: {
    eventId: string;
    canWrite: boolean;
    rsvpDeadline: string | null;
    countdownTarget: string;
    isRsvpDeadline: boolean;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const { data: report, isLoading, isError } = useRsvpReport(eventId, 'STATISTICS');
    const daysToGo = getDaysUntil(countdownTarget) ?? 0;
    const formattedTargetDate = formatDate(locale, countdownTarget, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="flex flex-col gap-8">
            {/* Countdown */}
            <div className="flex items-start gap-3 bg-background">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                        {t(isRsvpDeadline ? 'rsvpStats.deadlineLabel' : 'rsvpStats.eventDateLabel')}
                    </p>
                    <p className="text-sm font-semibold break-words text-ink">
                        {t('rsvpStats.daysToGo', { count: daysToGo })} · {formattedTargetDate}
                    </p>
                </div>
            </div>

            {/* RSVP deadline */}
            <RsvpDeadlineField eventId={eventId} rsvpDeadline={rsvpDeadline} canWrite={canWrite} />

            {/* Report */}
            {isLoading ? (
                <LoadingState size="md" className="min-h-32" />
            ) : isError || !report ? (
                <p className="text-sm text-rose-600">{t('rsvpReport.loadFailed')}</p>
            ) : (
                <>
                    {/* Headline numbers */}
                    <RsvpReportTiles totals={report.totals} />

                    {/* Attendance by category */}
                    {report.totals.responses === 0 ? (
                        <p className="text-sm text-ink-muted">{t('rsvpReport.empty')}</p>
                    ) : (
                        <>
                            <RsvpReportCategories categories={report.categories ?? []} />
                            <RsvpReportSessions sessions={report.sessions ?? []} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
