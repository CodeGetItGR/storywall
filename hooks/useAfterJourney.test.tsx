import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAfterJourney } from '@/hooks/useAfterJourney';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module.${key}` }) }));
vi.mock('@/hooks/useHostAnnouncementLink', () => ({ useHostAnnouncementLink: () => ({ label: 'Announcement', href: '/a' }) }));
vi.mock('@/hooks/useGalleryArchive', () => ({ useGallerySummary: () => ({ data: { photoCount: 12, videoCount: 2 } }) }));
vi.mock('@/hooks/useWishbook', () => ({ useWishbookCount: () => ({ data: 3 }) }));

const mocks = vi.hoisted(() => ({ isPrimaryHost: true, extensionOptions: [{ coverageOptionId: 'm1', months: 1 }] as unknown[] | undefined }));
vi.mock('@/hooks/useIsPrimaryHost', () => ({ useIsPrimaryHost: () => mocks.isPrimaryHost }));
vi.mock('@/hooks/useBilling', () => ({
    useExtensionOptions: (_eventId: string, enabled: boolean) => ({ data: enabled ? mocks.extensionOptions : undefined }),
}));

const event = {
    id: 'e1',
    eventType: 'WEDDING',
    status: 'ACTIVE',
    deletedAt: null,
    modules: ['gallery', 'wishbook'].map((moduleKey) => ({ moduleKey, isEnabled: true, isAvailable: true })),
    sessions: [
        { id: 'main', title: 'Ceremony', startAt: '2026-12-12T16:00:00Z', endAt: null, isMain: true, deletedAt: null, displayOrder: 0 },
        { id: 'brunch', title: 'Brunch', startAt: '2026-12-13T09:00:00Z', endAt: null, isMain: false, deletedAt: null, displayOrder: 1 },
    ],
    schedule: { startAt: '2026-12-12T16:00:00Z', timezone: 'Europe/Athens', coverageEndsAt: '2027-03-12T00:00:00Z' },
} as never;

const now = new Date('2026-12-14T10:00:00Z');
const planStop = () => renderHook(() => useAfterJourney(event, 'Premium', now)).result.current.stops.at(-1);

beforeEach(() => {
    mocks.isPrimaryHost = true;
    mocks.extensionOptions = [{ coverageOptionId: 'm1', months: 1 }];
});

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

    it('leaves out Extend when the plan sells no extension', () => {
        mocks.extensionOptions = [];
        expect(planStop()?.links).toBeUndefined();
    });

    it('leaves out Extend for a co-host', () => {
        mocks.isPrimaryHost = false;
        expect(planStop()?.links).toBeUndefined();
    });

    it('leaves out Extend once coverage has ended', () => {
        const ended = renderHook(() => useAfterJourney(event, 'Premium', new Date('2027-03-13T00:00:00Z'))).result.current.stops.at(-1);
        expect(ended?.links).toBeUndefined();
    });
});
