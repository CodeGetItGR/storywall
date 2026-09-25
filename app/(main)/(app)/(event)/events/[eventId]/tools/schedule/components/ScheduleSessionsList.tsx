'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleSessionCard } from '@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionCard';
import { ScheduleTimelineItem } from '@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleTimelineItem';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatDate, formatTimeRange } from '@/lib/datetime';
import { buildScheduleDays } from '@/lib/eventSessions';

interface ScheduleSessionsListProps {
    sessions: EventSessionResponseDto[];
    locale: string;
}

export function ScheduleSessionsList({ sessions, locale }: ScheduleSessionsListProps) {
    const t = useTranslations('SchedulePage');
    const { days, unscheduled } = buildScheduleDays(sessions);

    return (
        <div className="flex flex-col gap-8">
            {days.map(({ date, sessions: daySessions }) => (
                <section key={date}>
                    {/* Day */}
                    <h2 className="mb-3 text-base font-bold text-ink first-letter:uppercase">
                        {formatDate(locale, `${date}T00:00:00`, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>

                    {/* Timeline */}
                    <ol>
                        {daySessions.map((session, index) => (
                            <ScheduleTimelineItem
                                key={session.id}
                                session={session}
                                time={formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'))}
                                isLast={index === daySessions.length - 1}
                            />
                        ))}
                    </ol>
                </section>
            ))}

            {unscheduled.length > 0 && (
                <section>
                    {/* Unscheduled */}
                    <div className="mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                        <h2 className="text-base font-bold text-ink">{t('unscheduled')}</h2>
                    </div>

                    <div className="flex flex-col gap-4">
                        {unscheduled.map((session) => (
                            <ScheduleSessionCard key={session.id} session={session} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
