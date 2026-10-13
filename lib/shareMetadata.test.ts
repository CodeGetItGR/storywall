import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import { formatShareDetails, getQrShareEvent } from '@/lib/shareMetadata';

vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'en'), getTranslations: vi.fn() }));
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicCachedGet: vi.fn(), serverPublicGet: vi.fn() }));

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

describe('getQrShareEvent', () => {
    const get = vi.mocked(serverPublicCachedGet);
    const resolution = { status: 'ACTIVE', eventTitle: 'Code title', eventSubtitle: null, coverMedia: null };
    const invitePreview = {
        ...preview,
        eventTitle: 'Invite title',
        eventSubtitle: null,
        eventDescription: 'Come along',
        coverMedia: null,
        expired: false,
        alreadyUsed: false,
    };

    beforeEach(() => get.mockReset());

    it('uses the invite preview for a join code', async () => {
        get.mockResolvedValueOnce({ ...resolution, targetType: 'EVENT_JOIN', inviteToken: 'inv' }).mockResolvedValueOnce(invitePreview);

        const event = await getQrShareEvent('code');

        expect(get).toHaveBeenLastCalledWith(expect.stringContaining('inv'), expect.any(Number));
        expect(event).toMatchObject({ title: 'Invite title', description: 'Come along', targetType: 'EVENT_JOIN' });
        expect(event?.details).toContain('Villa Rosa');
    });

    it('keeps the code lookup when the invite preview fails', async () => {
        get.mockResolvedValueOnce({ ...resolution, targetType: 'EVENT_JOIN', inviteToken: 'inv' }).mockRejectedValueOnce(new Error('down'));

        expect(await getQrShareEvent('code')).toMatchObject({ title: 'Code title', targetType: 'EVENT_JOIN' });
    });

    it('does not look up an invite for an upload code', async () => {
        get.mockResolvedValueOnce({ ...resolution, targetType: 'MEDIA_UPLOAD', inviteToken: null });

        expect(await getQrShareEvent('code')).toMatchObject({ title: 'Code title', targetType: 'MEDIA_UPLOAD' });
        expect(get).toHaveBeenCalledTimes(1);
    });
});
