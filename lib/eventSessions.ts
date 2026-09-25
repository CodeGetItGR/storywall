import type { EventSessionResponseDto } from '@/lib/api/types';

export function sortSessions(sessions: EventSessionResponseDto[]): EventSessionResponseDto[] {
    return [...sessions].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;

        const aStart = a.startAt ? new Date(a.startAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bStart = b.startAt ? new Date(b.startAt).getTime() : Number.MAX_SAFE_INTEGER;

        return aStart - bStart;
    });
}

export function groupSessions(sessions: EventSessionResponseDto[]): Record<string, EventSessionResponseDto[]> {
    const grouped: Record<string, EventSessionResponseDto[]> = {};

    for (const session of sessions) {
        const key = session.startAt ? session.startAt.slice(0, 10) : 'unscheduled';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(session);
    }

    return grouped;
}

export interface ScheduleDay {
    date: string;
    sessions: EventSessionResponseDto[];
}

// Sessions grouped by calendar day in chronological order, plus the ones
// without a start time.
export function buildScheduleDays(sessions: EventSessionResponseDto[]): { days: ScheduleDay[]; unscheduled: EventSessionResponseDto[] } {
    const { unscheduled = [], ...byDate } = groupSessions(sortSessions(sessions));
    const days = Object.keys(byDate)
        .sort()
        .map((date) => ({ date, sessions: byDate[date] }));

    return { days, unscheduled };
}
