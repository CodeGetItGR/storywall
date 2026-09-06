'use client';

import { CalendarClock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { MetricStrip } from '@/components/ui/MetricStrip';
import { formatDate, getDaysUntil } from '@/lib/datetime';

const categories = ['GOING', 'NOT_GOING'] as const;

export function RsvpStatsPanel({
    countdownTarget,
    isRsvpDeadline,
    responseCount,
    seatsClaimed,
    adultsTotal,
    kidsTotal,
    peopleGoing,
    peopleNotGoing,
}: {
    countdownTarget: string;
    isRsvpDeadline: boolean;
    responseCount: number;
    seatsClaimed: number;
    adultsTotal: number;
    kidsTotal: number;
    peopleGoing: number;
    peopleNotGoing: number;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const peopleByCategory = { GOING: peopleGoing, NOT_GOING: peopleNotGoing };
    // "Not going" counts one head per guest who declined or hasn't responded,
    // since their actual party size is unknown — this total is people known
    // either way, not the event's full guest list.
    const peopleTotal = peopleGoing + peopleNotGoing;
    const daysToGo = getDaysUntil(countdownTarget) ?? 0;
    const formattedTargetDate = formatDate(locale, countdownTarget, { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="flex flex-col gap-8">
            {/* Countdown */}
            <div className="flex items-center gap-3 bg-background">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                        {t(isRsvpDeadline ? 'rsvpStats.deadlineLabel' : 'rsvpStats.eventDateLabel')}
                    </p>
                    <p className="truncate text-sm font-semibold text-ink">
                        {t('rsvpStats.daysToGo', { count: daysToGo })} · {formattedTargetDate}
                    </p>
                </div>
            </div>

            {/* Headline numbers */}
            <MetricStrip
                items={[
                    { key: 'responses', label: t('rsvpStats.responses'), value: responseCount },
                    { key: 'people', label: t('rsvpStats.totalPeople'), value: seatsClaimed },
                    { key: 'adults', label: t('rsvpStats.adults'), value: adultsTotal },
                    { key: 'kids', label: t('rsvpStats.kids'), value: kidsTotal },
                ]}
            />

            {/* Attendance by category */}
            <div className="p-4" hidden={peopleTotal === 0}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">{t('rsvpStats.byCategory')}</p>
                <div className="flex flex-col gap-3">
                    {categories.map((status) => {
                        const count = peopleByCategory[status];
                        if (count === 0) return null;
                        const percent = peopleTotal === 0 ? 0 : Math.round((count / peopleTotal) * 100);

                        return (
                            <div key={status}>
                                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                                    <span className="text-ink-muted">
                                        {t(status === 'GOING' ? 'rsvpBreakdown.attending' : 'rsvpStats.notGoing')}
                                    </span>
                                    <span className="font-bold tabular-nums text-ink">
                                        {count} <span className="font-normal text-ink-faint">{percent}%</span>
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                                </div>
                                {status === 'GOING' && <p className="mt-1 text-[11px] text-ink-faint">{t('rsvpStats.attendingNote')}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
