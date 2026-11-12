import { describe, expect, it } from 'vitest';

import { storyEvent, storyMedia, storyModules, storySession } from '@/.storybook/fixtures';
import { eventImageUrls, invitationEventDataFromDetail } from '@/lib/invitation/eventData';

describe('invitationEventDataFromDetail', () => {
    const event = storyEvent({
        title: 'Άγγελος & Αλεξάνδρα',
        schedule: { startAt: '2027-08-29T16:30:00Z', endAt: null, coverageEndsAt: null, projectedCoverage: null, timezone: 'Europe/Athens', rsvpDeadline: '2027-07-05T09:00:00Z' },
        coverMedia: storyMedia('m-cover', { width: 1600, height: 1000, mediaUrl: 'https://cdn.example/cover.jpg' }),
        sessions: [storySession({ id: 's1' }), storySession({ id: 's-gone', deletedAt: '2027-01-01T00:00:00Z' })],
        modules: storyModules(['rsvp', 'schedule', 'posts']),
    });

    it('carries what the invitation follows', () => {
        const data = invitationEventDataFromDetail(event, 'https://storywall.gr/q/abc');
        expect(data).toMatchObject({
            title: 'Άγγελος & Αλεξάνδρα',
            timezone: 'Europe/Athens',
            startAt: '2027-08-29T16:30:00Z',
            rsvp: { deadline: '2027-07-05T09:00:00Z' },
            cover: { mediaId: 'm-cover', width: 1600, height: 1000 },
            joinUrl: 'https://storywall.gr/q/abc',
        });
        expect(data.sessions?.map((session) => session.id)).toEqual(['s1']);
    });

    it('leaves out what the plan does not include', () => {
        const data = invitationEventDataFromDetail({ ...event, modules: storyModules([]) }, 'https://storywall.gr/q/abc');
        expect(data).toMatchObject({ rsvp: null, sessions: null, joinUrl: null });
    });

    it('takes no video as the cover', () => {
        const data = invitationEventDataFromDetail({ ...event, coverMedia: storyMedia('m-video', { mediaType: 'VIDEO' }) });
        expect(data.cover).toBeNull();
    });

    it('gives the cover URL to the editor', () => {
        expect(eventImageUrls(event)).toEqual({ 'm-cover': 'https://cdn.example/cover.jpg' });
        expect(eventImageUrls(undefined)).toEqual({});
    });
});
