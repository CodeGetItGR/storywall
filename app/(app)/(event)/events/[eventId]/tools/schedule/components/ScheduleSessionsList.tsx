'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleSessionCard } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionCard';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatDate, formatTime, formatTimeRange } from '@/lib/datetime';
import { groupSessions, sortSessions } from '@/lib/eventSessions';

interface ScheduleSessionsListProps {
    sessions: EventSessionResponseDto[];
    editingSessionId: string | null;
    isHost: boolean;
    locale: string;
    onEdit: (session: EventSessionResponseDto) => void;
    onDelete: (session: EventSessionResponseDto) => void;
    deleteDisabled: boolean;
    canManage: boolean;
}

export function ScheduleSessionsList({
    sessions,
    editingSessionId,
    isHost,
    locale,
    onEdit,
    onDelete,
    deleteDisabled,
    canManage,
}: ScheduleSessionsListProps) {
    const t = useTranslations('SchedulePage');
    const sortedSessions = sortSessions(sessions);
    const groupedSessions = groupSessions(sortedSessions);
    const datedKeys = Object.keys(groupedSessions)
        .filter((key) => key !== 'unscheduled')
        .sort();
    const unscheduledSessions = groupedSessions.unscheduled ?? [];

    return (
        <div className="flex flex-col gap-8">
            {datedKeys.map((date) => (
                <section key={date}>
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                            <span className="text-[9px] font-medium uppercase leading-none text-ink-muted">
                                {formatDate(locale, `${date}T00:00:00`, { month: 'short' })}
                            </span>
                            <span className="text-sm font-bold leading-none text-ink">
                                {formatDate(locale, `${date}T00:00:00`, { day: 'numeric' })}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-ink">
                            {formatDate(locale, `${date}T00:00:00`, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="relative flex flex-col gap-4 pl-5">
                        <div className="absolute bottom-2 top-2 left-2 w-px bg-border" aria-hidden="true" />

                        {groupedSessions[date].map((session) => (
                            <div key={session.id} className="relative">
                                <div
                                    className="absolute -left-5 top-3 h-3.5 w-3.5 rounded-full border-2 border-background bg-amber-200"
                                    aria-hidden="true"
                                />
                                <ScheduleSessionCard
                                    session={session}
                                    isHost={isHost}
                                    canManage={canManage}
                                    isEditing={editingSessionId === session.id}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    deleteDisabled={deleteDisabled}
                                    timeContent={
                                        <div className="text-right">
                                            <p className="text-sm font-semibold tabular-nums text-ink">
                                                {formatTimeRange(locale, session.startAt, session.endAt, t('timeTba'))}
                                            </p>
                                            {session.endAt && (
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                                                    {t('endsAt', { time: formatTime(locale, session.endAt) })}
                                                </p>
                                            )}
                                        </div>
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {unscheduledSessions.length > 0 && (
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                        <p className="text-sm font-bold text-ink">{t('unscheduled')}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {unscheduledSessions.map((session) => (
                            <ScheduleSessionCard
                                key={session.id}
                                session={session}
                                isHost={isHost}
                                canManage={canManage}
                                isEditing={editingSessionId === session.id}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                deleteDisabled={deleteDisabled}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
