import { describe, expect, it, vi } from 'vitest';

import { formatShareDetails } from '@/lib/shareMetadata';

vi.mock('next-intl/server', () => ({ getLocale: vi.fn(), getTranslations: vi.fn() }));

const preview = {
    eventStartAt: '2026-11-14T18:00:00+02:00',
    eventEndAt: '2026-11-14T23:00:00+02:00',
    eventTimezone: 'Europe/Athens',
    eventLocationName: ' Villa Rosa ',
};

// Intl puts narrow and thin spaces around times and ranges.
function details(...args: Parameters<typeof formatShareDetails>) {
    return formatShareDetails(...args)?.replace(/\s/g, ' ') ?? null;
}

describe('formatShareDetails', () => {
    it('joins the date, the times and the venue in the event time zone', () => {
        expect(details('en', preview)).toBe('Sat, Nov 14, 2026 · 6:00 – 11:00 PM · Villa Rosa');
    });

    it('leaves out a missing venue', () => {
        expect(details('en', { ...preview, eventLocationName: null })).toBe('Sat, Nov 14, 2026 · 6:00 – 11:00 PM');
    });

    it('shows only the venue when the date is unreadable', () => {
        expect(details('en', { ...preview, eventStartAt: 'nope' })).toBe('Villa Rosa');
    });

    it('shows nothing without a date or a venue', () => {
        expect(details('en', { ...preview, eventStartAt: 'nope', eventLocationName: '  ' })).toBeNull();
    });
});
