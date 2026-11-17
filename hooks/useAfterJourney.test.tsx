import { renderHook } from '@testing-library/react';
import { Megaphone } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { useAfterJourney } from '@/hooks/useAfterJourney';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));
vi.mock('@/hooks/useToolsMenuItems', () => ({
    useHostMenuItems: () => [{ key: 'announcement', href: '/a', icon: Megaphone, label: 'Announcement' }],
}));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: { photoCount: 12, videoCount: 2 } }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbookCount: () => ({ data: 3 }) }));

const event = {
    id: 'e1',
    eventType: 'WEDDING',
    deletedAt: null,
    modules: ['gallery', 'wishbook'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true })),
    sessions: [
        { id: 'main', title: 'Ceremony', startAt: '2026-12-12T16:00:00Z', endAt: null, isMain: true, deletedAt: null, displayOrder: 0 },
        { id: 'brunch', title: 'Brunch', startAt: '2026-12-13T09:00:00Z', endAt: null, isMain: false, deletedAt: null, displayOrder: 1 },
    ],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens', coverageEndsAt: '2027-03-12T00:00:00Z' },
} as never;

describe('useAfterJourney', () => {
    it('starts with later sessions, then media, wishbook, announcement and the plan', () => {
        const { result } = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z')));
        expect(result.current.stops.map((stop) => stop.key)).toEqual(['session-brunch', 'media', 'wishbook', 'announcement', 'plan']);
    });

    it('makes media the current card with Download all', () => {
        const media = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z'))).result.current.stops[1];
        expect(media).toMatchObject({ status: 'current', detail: 'journey.media:{"photos":12,"videos":2}' });
        expect(media.card?.action.label).toBe('coverage.download');
    });

    it('names the plan, when coverage ends, and links to Extend', () => {
        const plan = renderHook(() => useAfterJourney(event, 'Premium', new Date('2026-12-14T10:00:00Z'))).result.current.stops.at(-1);
        expect(plan).toMatchObject({ title: 'Premium', detail: expect.stringMatching(/^journey\.coverageEnds:/) });
        expect(plan?.links?.[0].label).toBe('journey.extend');
    });
});
