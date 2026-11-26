'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useMinuteClock } from '@/hooks/useMinuteClock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate, formatTime } from '@/lib/datetime';
import type { SessionState } from '@/lib/eventJourney';
import { feedScheduleDays, type FeedScheduleRow, upcomingScheduleDays } from '@/lib/feedSchedule';

// rsvpEnabled: the host asks guests about this session, so its row takes their RSVP.
export type FeedScheduleItem = { id: string; time: string; title: string; place: string | null; state: SessionState; rsvpEnabled: boolean };

// label: the day's date, only when the event has sessions on several days.
export type FeedScheduleDayItems = { day: string; label: string | null; items: FeedScheduleItem[] };

function scheduleItem({ session, state }: FeedScheduleRow, locale: string, timeZone: string): FeedScheduleItem {
    return {
        id: session.id,
        time: formatTime(locale, session.startAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }),
        title: session.title,
        place: session.locationName,
        state,
        rsvpEnabled: session.rsvpEnabled,
    };
}

// The schedule's timeline (KAN-283, KAN-293): the sessions to come and the one under way, by day. Until the browser
// has the time, all of them read as to come. keepPast: once the last session is over, every session, greyed (edit
// mode, where the host still moves or deletes the block).
export function useFeedScheduleDays(event: Pick<EventDetailResponseDto, 'schedule' | 'sessions'>, keepPast = false): FeedScheduleDayItems[] {
    const locale = useLocale();
    const now = useMinuteClock();

    return useMemo(() => {
        const at = new Date(now ?? 0);
        const upcoming = upcomingScheduleDays(event, at);
        const days = upcoming.length === 0 && keepPast ? feedScheduleDays(event, at) : upcoming;
        return days.map(({ day, timeZone, rows }) => ({
            day,
            label:
                days.length > 1
                    ? formatDate(locale, rows[0].session.startAt ?? day, { weekday: 'long', month: 'long', day: 'numeric', timeZone })
                    : null,
            items: rows.map((row) => scheduleItem(row, locale, timeZone)),
        }));
    }, [event, keepPast, locale, now]);
}
