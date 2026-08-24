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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1f2937_0%,#111827_44%,#0b0f17_100%)]">
            {/* Schedule content */}
            <div className="h-full overflow-y-auto px-5 pb-10 pt-24 text-white">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold leading-tight">{t('story.title')}</h1>
                </div>

                <div className="flex flex-col gap-6">
                    {datedKeys.map((date) => (
                        <section key={date}>
                            <div className="mb-3 flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-white/12">
                                    <span className="text-[9px] font-semibold uppercase leading-none text-amber-100">
                                        {formatDate(locale, `${date}T00:00:00`, { month: 'short' })}
                                    </span>
                                    <span className="text-sm font-bold leading-none text-white">
                                        {formatDate(locale, `${date}T00:00:00`, { day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-white">
                                    {formatDate(locale, `${date}T00:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                            </div>

                            <div className="relative flex flex-col gap-3 pl-5">
                                <div className="absolute bottom-2 left-[8px] top-2 w-px bg-white/20" aria-hidden="true" />
                                {groupedSessions[date].map((session) => (
                                    <ScheduleStorySession key={session.id} session={session} locale={locale} />
                                ))}
                            </div>
                        </section>
                    ))}

                    {unscheduledSessions.length > 0 && (
                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-white/55" aria-hidden="true" />
                                <p className="text-sm font-bold text-white">{t('unscheduled')}</p>
                            </div>
                            <div className="flex flex-col gap-3">
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
