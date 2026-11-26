import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedSchedule, useFeedScheduleDays } from '@/hooks/useFeedSchedule';
import type { EventDetailResponseDto } from '@/lib/api/types';
import en from '@/messages/en.json';

const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={en}>
        {children}
    </NextIntlClientProvider>
);
const event = {
    schedule: { startAt: '2026-12-19T14:00:00Z', timezone: 'Europe/Athens' },
    sessions: [
        {
            id: 'church',
            title: 'Church',
            startAt: '2026-12-19T14:00:00Z',
            endAt: '2026-12-19T15:00:00Z',
            locationName: 'St. Nicholas',
            deletedAt: null,
            rsvpEnabled: true,
        },
    ],
} as unknown as EventDetailResponseDto;
const church = { id: 'church', time: '16:00', title: 'Church', place: 'St. Nicholas', rsvpEnabled: true };

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-12-19T13:59:30Z'));
});
afterEach(() => vi.useRealTimers());

describe('useFeedSchedule', () => {
    it("gives each row its time in the event's time zone, its place, its state and whether it takes RSVPs", () => {
        const { result } = renderHook(() => useFeedSchedule(event), { wrapper });
        expect(result.current).toEqual([{ ...church, state: 'upcoming' }]);
    });

    it('moves on once a minute, and has nothing to show once the last session is over', () => {
        const { result } = renderHook(() => useFeedSchedule(event), { wrapper });
        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(result.current).toEqual([{ ...church, state: 'now' }]);
        act(() => {
            vi.advanceTimersByTime(3_600_000);
        });
        expect(result.current).toBeNull();
    });
});

describe('useFeedScheduleDays', () => {
    const wrapperIn = (locale: 'en' | 'el') =>
        function Wrapper({ children }: { children: ReactNode }) {
            return <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>;
        };

    it('has no date heading on a one-day event, and keeps sessions that are over', () => {
        vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
        const { result } = renderHook(() => useFeedScheduleDays(event), { wrapper });
        expect(result.current).toEqual([{ day: '2026-12-19', label: null, items: [{ ...church, state: 'done' }] }]);
    });

    it("heads each day with its date, in the event's time zone and the viewer's language", () => {
        // Midnight in Athens, the evening before in UTC.
        const night = { ...event.sessions?.[0], id: 'night', startAt: '2026-12-19T22:00:00Z', endAt: null };
        const twoDays = { ...event, sessions: [...(event.sessions ?? []), night] } as EventDetailResponseDto;
        const labels = (locale: 'en' | 'el') =>
            renderHook(() => useFeedScheduleDays(twoDays), { wrapper: wrapperIn(locale) }).result.current.map((day) => day.label);
        expect(labels('en')).toEqual(['Saturday, December 19', 'Sunday, December 20']);
        expect(labels('el')).toEqual(['Σάββατο 19 Δεκεμβρίου', 'Κυριακή 20 Δεκεμβρίου']);
    });
});
