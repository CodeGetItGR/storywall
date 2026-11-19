import { renderHook } from '@testing-library/react';
import { Ticket } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { useDayJourney } from '@/hooks/useDayJourney';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));
vi.mock('@/hooks/useToolsMenuItems', () => ({
    useHostMenuItems: () => [
        { key: 'manage', href: '/m', icon: Ticket, label: 'Manage' },
        { key: 'invitationsQr', href: '/qr', icon: Ticket, label: 'Share links' },
    ],
}));
vi.mock('@/hooks/useHostAnnouncementLink', () => ({ useHostAnnouncementLink: () => ({ label: 'Announcement', href: '/a' }) }));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: { photoCount: 12, videoCount: 2 } }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbookCount: () => ({ data: 3 }) }));

const session = (id: string, startAt: string, endAt: string | null = null, isMain = false) => ({
    id,
    title: id,
    startAt,
    endAt,
    isMain,
    deletedAt: null,
    displayOrder: 0,
});

const event = {
    id: 'e1',
    eventType: 'WEDDING',
    deletedAt: null,
    modules: ['gallery', 'wishbook', 'playlist'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true })),
    sessions: [
        session('Ceremony', '2026-12-12T16:00:00Z', '2026-12-12T17:00:00Z', true),
        session('Reception', '2026-12-12T18:30:00Z'),
        session('Party', '2026-12-12T21:00:00Z'),
    ],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens' },
} as never;

describe('useDayJourney', () => {
    it("shows the day's sessions with the running one current", () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.stops.map((stop) => [stop.title, stop.status])).toEqual([
            ['Ceremony', 'done'],
            ['Reception', 'current'],
            ['Party', 'upcoming'],
        ]);
        expect(result.current.stops[1]).toMatchObject({ highlight: 'journey.now', badge: expect.stringMatching(/20:30/) });
    });

    it('offers share links, the announcement and the playlist as quick tools', () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.tools.map((tool) => tool.key)).toEqual(['invitationsQr', 'announcement', 'playlist']);
    });

    it('totals the media and the wishbook', () => {
        const { result } = renderHook(() => useDayJourney(event, new Date('2026-12-12T19:00:00Z')));
        expect(result.current.totals).toEqual([
            { key: 'media', icon: 'media', value: 14, label: 'mediaSummary.title' },
            { key: 'wishbook', icon: 'wishbook', value: 3, label: 'module.wishbook' },
        ]);
    });
});
