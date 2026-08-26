'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleStorySession } from '@/components/story/ScheduleStorySession';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { groupSessions, sortSessions } from '@/lib/eventSessions';

interface ScheduleStoryContentProps {
    sessions: EventSessionResponseDto[];
    locale: string;
}

export function ScheduleStoryContent({ sessions, locale }: ScheduleStoryContentProps) {
    const t = useTranslations('SchedulePage');
    const sortedSessions = sortSessions(sessions);
    const groupedSessions = groupSessions(sortedSessions);
    const datedKeys = Object.keys(groupedSessions)
        .filter((key) => key !== 'unscheduled')
        .sort();
    const unscheduledSessions = groupedSessions.unscheduled ?? [];

    return (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#212a3d_0%,#1a2131_100%)]">
            {/* Schedule Content */}
            <div className="h-full overflow-y-auto px-5 pb-10 pt-24 text-white">
                <div className="flex flex-col gap-6">
                    {datedKeys.map((date) => (
                        <section key={date}>
                            {/* Date Header */}
                            <div className="mb-3 flex items-center gap-3">
                                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-white text-center shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                                    <span className="text-[10px] font-semibold uppercase leading-none text-amber-700">
                                        {formatDate(locale, `${date}T00:00:00`, { month: 'short' })}
                                    </span>
                                    <span className="text-base font-bold leading-none text-[#1b2232]">
                                        {formatDate(locale, `${date}T00:00:00`, { day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-white/92">{formatDate(locale, `${date}T00:00:00`, { weekday: 'long' })}</p>
                            </div>

                            {/* Session List */}
                            <div className="flex flex-col">
                                {groupedSessions[date].map((session) => (
                                    <ScheduleStorySession key={session.id} session={session} locale={locale} />
                                ))}
                            </div>
                        </section>
                    ))}

                    {unscheduledSessions.length > 0 && (
                        <section>
                            {/* Unscheduled Header */}
                            <div className="mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-white/55" aria-hidden="true" />
                                <p className="text-sm font-bold text-white/92">{t('unscheduled')}</p>
                            </div>
                            {/* Unscheduled Sessions */}
                            <div className="flex flex-col border-t border-white/10">
                                {unscheduledSessions.map((session) => (
                                    <ScheduleStorySession key={session.id} session={session} locale={locale} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
