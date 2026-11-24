'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useMinuteClock } from '@/hooks/useMinuteClock';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatTime } from '@/lib/datetime';
import type { SessionState } from '@/lib/eventJourney';
import { feedScheduleDay } from '@/lib/feedSchedule';

// rsvpEnabled: the host asks guests about this session, so its row takes their RSVP.
export type FeedScheduleItem = { id: string; time: string; title: string; place: string | null; state: SessionState; rsvpEnabled: boolean };

// Today's schedule as it draws: each session's start time in the event's time zone, its title, place and state.
// Null when there's nothing to show (or the browser doesn't have the time yet).
export function useFeedSchedule(event: Pick<EventDetailResponseDto, 'schedule' | 'sessions'>): FeedScheduleItem[] | null {
    const locale = useLocale();
    const now = useMinuteClock();

    return useMemo(() => {
        if (now === null) return null;
        const day = feedScheduleDay(event, new Date(now));
        if (!day) return null;
        const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: day.timeZone };
        return day.rows.map(({ session, state }) => ({
            id: session.id,
            time: formatTime(locale, session.startAt, options),
            title: session.title,
            place: session.locationName,
            state,
            rsvpEnabled: session.rsvpEnabled,
        }));
    }, [event, locale, now]);
}
