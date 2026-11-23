import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { type EventInfoEvent,EventInfoSection } from '@/components/feed/EventInfoSection';
import en from '@/messages/en.json';

afterEach(cleanup);

const EVENT = {
    id: 'ev-1',
    title: 'Maria & Nikos',
    schedule: { startAt: '2026-12-30T16:00:00Z', endAt: null, timezone: 'Europe/Athens' },
    location: { name: 'Rhodes', address: null },
    sessions: [],
} as unknown as EventInfoEvent;

function renderRow(placeHref: string | null) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <EventInfoSection event={EVENT} placeHref={placeHref} />
        </NextIntlClientProvider>,
    );
}

describe('EventInfoSection', () => {
    it('shows the date in capitals and the place', () => {
        renderRow(null);
        expect(screen.getByText('DEC 30, 2026')).toBeTruthy();
        expect(screen.getByText('Rhodes')).toBeTruthy();
    });

    it('opens Add to calendar from the date', () => {
        renderRow(null);
        fireEvent.click(screen.getByRole('button', { name: `${en.FeedPage.addToCalendar}: DEC 30, 2026` }));
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('links the place only when it is given a link', () => {
        renderRow('/events/ev-1/location/main');
        expect(screen.getByRole('link', { name: /Rhodes/ }).getAttribute('href')).toBe('/events/ev-1/location/main');
        cleanup();
        renderRow(null);
        expect(screen.queryByRole('link')).toBeNull();
    });
});
