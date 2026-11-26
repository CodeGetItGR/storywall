'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useMinuteClock } from '@/hooks/useMinuteClock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate, formatTime } from '@/lib/datetime';
import type { SessionState } from '@/lib/eventJourney';
import { feedScheduleDay, feedScheduleDays, type FeedScheduleRow } from '@/lib/feedSchedule';

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

// Today's schedule as it draws: each session's start time in the event's time zone, its title, place and state.
// Null when there's nothing to show (or the browser doesn't have the time yet).
export function useFeedSchedule(event: Pick<EventDetailResponseDto, 'schedule' | 'sessions'>): FeedScheduleItem[] | null {
    const locale = useLocale();
    const now = useMinuteClock();

    return useMemo(() => {
        if (now === null) return null;
        const day = feedScheduleDay(event, new Date(now));
        if (!day) return null;
        return day.rows.map((row) => scheduleItem(row, locale, day.timeZone));
    }, [event, locale, now]);
}

// The Schedule block's timeline: every session, by day. Until the browser has the time, all of them read as to come.
export function useFeedScheduleDays(event: Pick<EventDetailResponseDto, 'schedule' | 'sessions'>): FeedScheduleDayItems[] {
    const locale = useLocale();
    const now = useMinuteClock();

    return useMemo(() => {
        const days = feedScheduleDays(event, new Date(now ?? 0));
        return days.map(({ day, timeZone, rows }) => ({
            day,
            label:
                days.length > 1
                    ? formatDate(locale, rows[0].session.startAt ?? day, { weekday: 'long', month: 'long', day: 'numeric', timeZone })
                    : null,
            items: rows.map((row) => scheduleItem(row, locale, timeZone)),
        }));
    }, [event, locale, now]);
}
