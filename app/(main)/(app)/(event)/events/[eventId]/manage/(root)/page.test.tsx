import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    resolveServerEventContext: vi.fn(),
    resolveServerEventDetail: vi.fn(),
    serverGet: vi.fn(),
    serverGetOrNull: vi.fn(),
    serverPublicGetOrNull: vi.fn(),
    fetchThemeCatalogue: vi.fn(),
    fetchUploadedFonts: vi.fn(),
    showsFeedEditor: vi.fn(),
    redirect: vi.fn(() => {
        throw new Error('NEXT_REDIRECT');
    }),
}));

vi.mock('@/lib/auth/serverEventContext', () => ({
    resolveServerEventContext: mocks.resolveServerEventContext,
    resolveServerEventDetail: mocks.resolveServerEventDetail,
}));
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: mocks.serverGet,
    serverGetOrNull: mocks.serverGetOrNull,
    serverPublicGetOrNull: mocks.serverPublicGetOrNull,
}));
vi.mock('@/lib/invitation/serverThemeCatalogue', () => ({ fetchThemeCatalogue: mocks.fetchThemeCatalogue }));
vi.mock('@/lib/invitation/serverUploadedFonts', () => ({ fetchUploadedFonts: mocks.fetchUploadedFonts }));
vi.mock('@/lib/feedEditorRelease', () => ({ showsFeedEditor: mocks.showsFeedEditor }));
vi.mock('@/i18n/serverLocale', () => ({ getServerLocale: async () => 'en' }));
vi.mock('../PageClient', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';

import Page from './page';

const hostContext = { accessToken: 'token-1', memberships: [], activeEventId: 'e1', isHost: true };
const liveEvent = {
    id: 'e1',
    status: 'ACTIVE',
    deletedAt: null,
    schedule: { endAt: '2999-01-01T00:00:00Z' },
    modules: [{ moduleKey: 'rsvp', isAvailable: true, isEnabled: true }],
};

const journeyEvent = {
    ...liveEvent,
    modules: ['rsvp', 'wishlist', 'gallery', 'wishbook'].map((moduleKey) => ({ moduleKey, isAvailable: true, isEnabled: true })),
};

const themedEvent = { ...liveEvent, modules: [...liveEvent.modules, { moduleKey: 'theme', isAvailable: false, isEnabled: true }] };

// A live wedding with Save my date: the Overview's feed banner shows to every host.
const bannerEvent = {
    ...liveEvent,
    eventType: 'WEDDING',
    theme: null,
    hosts: [{ memberId: 'm-main', displayOrder: 0 }],
    modules: [...liveEvent.modules, { moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }],
};
const catalogue = [
    { slug: 'baptism-first', eventType: 'BAPTISM' },
    { slug: 'wedding-first', eventType: 'WEDDING' },
];
const ownThemeLayout = {
    themeSlug: 'olive-garden',
    revision: 2,
    document: { ...defaultFeedLayout(), themeId: 'olive-garden' },
    design: SAMPLE_THEME,
    imageUrls: {},
    updatedAt: '2026-11-21T10:00:00Z',
};
// The catalogue's first wedding theme, as GET /api/invitation-themes/{slug} answers it.
const standIn = { slug: 'wedding-first', name: 'Wedding', eventType: 'WEDDING', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, assetUrls: {} };
const uploadedFonts = [{ key: 'brush', familyName: 'Brush', fallback: 'serif', url: 'https://fonts/brush.woff2' }];
const bannerKeys = [feedLayoutKeys.detail('e1'), invitationThemeKeys.catalogue(), invitationThemeKeys.publicTheme('wedding-first')];

function visit(searchParams: { tab?: string; section?: string } = {}) {
    return Page({ params: Promise.resolve({ eventId: 'e1' }), searchParams: Promise.resolve(searchParams) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

describe('ManagePage (server)', () => {
    beforeEach(() => {
        mocks.resolveServerEventContext.mockReset().mockResolvedValue(hostContext);
        mocks.resolveServerEventDetail.mockReset().mockResolvedValue(liveEvent);
        mocks.serverGet.mockReset().mockResolvedValue([]);
        mocks.serverGetOrNull.mockReset().mockResolvedValue(null);
        mocks.serverPublicGetOrNull.mockReset().mockResolvedValue(standIn);
        mocks.fetchUploadedFonts.mockReset().mockResolvedValue(uploadedFonts);
        mocks.fetchThemeCatalogue.mockReset().mockResolvedValue(catalogue);
        mocks.showsFeedEditor.mockReset().mockReturnValue(false);
        mocks.redirect.mockClear();
    });

    it('sends the old Invitation tab to Invitations & QR codes', async () => {
        await expect(visit({ tab: 'invitation' })).rejects.toThrow('NEXT_REDIRECT');

        expect(mocks.redirect).toHaveBeenCalledWith('/events/e1/manage/qr');
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('seeds the gift, null when the event is not one', async () => {
        const element = await visit();
        const { state } = element.props as { state: DehydratedState };
        const gift = state.queries.find((query) => query.queryKey.join('/') === 'events/e1/gift');
        expect(mocks.serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/gift', 'token-1');
        expect(gift?.state.data).toBeNull();
    });

    it('asks for the event while the memberships are still loading', async () => {
        mocks.resolveServerEventContext.mockReturnValue(new Promise(() => {}));
        void visit();

        await vi.waitFor(() => expect(mocks.resolveServerEventDetail).toHaveBeenCalledWith('e1'));
    });

    it('requests usage and the guest lists together', async () => {
        mocks.serverGet.mockImplementation((path: string) => (path.endsWith('/usage') ? new Promise(() => {}) : Promise.resolve([])));
        void visit();

        await vi.waitFor(() => expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/members', 'token-1'));
    });

    it('seeds usage and every guest list', async () => {
        expect(seededKeys(await visit())).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'usage'],
                ['events', 'e1', 'members'],
                ['events', 'e1', 'rsvps'],
                ['events', 'e1', 'invitations'],
            ]),
        );
    });

    it('seeds usage and the gift even when a guest list request fails', async () => {
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/members') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit())).toEqual([
            ['events', 'e1', 'usage'],
            ['events', 'e1', 'gift'],
            ['events', 'e1', 'qr-links'],
        ]);
    });

    it('prefetches only usage for a draft event', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, status: 'DRAFT' });

        expect(seededKeys(await visit())).toEqual([['events', 'e1', 'usage']]);
    });

    it('prefetches nothing for a guest', async () => {
        mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, isHost: false });

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('prefetches nothing for a deleted event', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...liveEvent, deletedAt: '2026-09-01T00:00:00Z' });

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    it('seeds the theme presets when the theme tab opens on a plan with themes', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);

        const element = await visit({ tab: 'theme' });

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
        expect(seededKeys(element)).toEqual(expect.arrayContaining([['events', 'e1', 'theme-presets']]));
    });

    it('skips the theme presets once the event has ended (the server answers 5144)', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...themedEvent, schedule: { endAt: '2020-01-01T00:00:00Z' } });

        await visit({ tab: 'theme' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it('skips the theme presets on other tabs', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);

        await visit();
        await visit({ tab: 'settings' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it("skips the theme presets when the plan doesn't include themes", async () => {
        await visit({ tab: 'theme' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it('skips the theme presets when the theme row is present but not enabled', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...themedEvent, modules: [{ moduleKey: 'theme', isAvailable: true, isEnabled: false }] });

        await visit({ tab: 'theme' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
    });

    it("seeds the theme presets for a draft's overview, whatever the tab", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...themedEvent, status: 'DRAFT' });

        const element = await visit({ tab: 'members' });

        expect(mocks.serverGet).toHaveBeenCalledWith('/api/events/e1/theme-presets', 'token-1');
        expect(seededKeys(element)).toEqual([
            ['events', 'e1', 'usage'],
            ['events', 'e1', 'theme-presets'],
        ]);
    });

    it('still seeds the rest when the theme presets fail', async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(themedEvent);
        mocks.serverGet.mockImplementation((path: string) =>
            path.endsWith('/theme-presets') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve([]),
        );

        expect(seededKeys(await visit({ tab: 'theme' }))).toEqual(expect.arrayContaining([['events', 'e1', 'usage']]));
    });

    it("seeds the journey's reads on the overview of a live event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(journeyEvent);
        mocks.serverGet.mockImplementation((path: string) => Promise.resolve(path.endsWith('/wishbook/count') ? 3 : []));

        const element = await visit();

        expect(mocks.serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
        expect(seededKeys(element)).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'gift-account'],
                ['events', 'e1', 'qr-links'],
                ['events', 'e1', 'media', 'summary'],
                ['events', 'e1', 'wishbook', 'count'],
            ]),
        );
    });

    it('prefetches the RSVP page report, also from an old ?section= link', async () => {
        await visit({ tab: 'rsvp', section: 'list' });

        expect(mocks.serverGet).toHaveBeenCalledWith(expect.stringContaining('STATISTICS'), 'token-1');
    });

    it('leaves the RSVP report out on another section', async () => {
        await visit({ tab: 'members' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith(expect.stringContaining('STATISTICS'), 'token-1');
    });

    it("skips the journey's reads on another section", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(journeyEvent);

        await visit({ tab: 'rsvp' });

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/qr-links', 'token-1');
        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/media/summary', 'token-1');
        expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
    });

    it('leaves out the reads of modules the plan lacks', async () => {
        await visit();

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/media/summary', 'token-1');
        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/wishbook/count', 'token-1');
        expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
    });

    it("skips the journey's reads for a draft event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue({ ...journeyEvent, status: 'DRAFT' });

        await visit();

        expect(mocks.serverGet).not.toHaveBeenCalledWith('/api/events/e1/qr-links', 'token-1');
        expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/gift-account', 'token-1');
    });

    it("prefetches nothing when Spring can't return the event", async () => {
        mocks.resolveServerEventDetail.mockResolvedValue(null);

        expect(seededKeys(await visit())).toEqual([]);
        expect(mocks.serverGet).not.toHaveBeenCalled();
    });

    describe("the Overview's feed banner picture", () => {
        beforeEach(() => {
            mocks.showsFeedEditor.mockReturnValue(true);
            mocks.resolveServerEventDetail.mockResolvedValue(bannerEvent);
        });

        it('seeds the layout, the catalogue and the stand-in theme for a feed on the wall theme', async () => {
            const element = await visit();

            expect(mocks.serverGetOrNull).toHaveBeenCalledWith('/api/events/e1/feed-layout', 'token-1');
            expect(mocks.serverPublicGetOrNull).toHaveBeenCalledWith('/api/invitation-themes/wedding-first');
            expect(seededKeys(element)).toEqual(expect.arrayContaining(bannerKeys));
        });

        it('seeds only the layout when it has its own Save my date theme', async () => {
            mocks.serverGetOrNull.mockImplementation((path: string) => Promise.resolve(path.endsWith('/feed-layout') ? ownThemeLayout : null));

            const keys = seededKeys(await visit());

            expect(mocks.fetchThemeCatalogue).not.toHaveBeenCalled();
            expect(mocks.serverPublicGetOrNull).not.toHaveBeenCalled();
            expect(keys).toEqual(expect.arrayContaining([bannerKeys[0]]));
            expect(keys).not.toEqual(expect.arrayContaining([bannerKeys[1]]));
        });

        it('seeds only the layout for an event type without Save my date themes', async () => {
            mocks.resolveServerEventDetail.mockResolvedValue({ ...bannerEvent, eventType: 'BIRTHDAY' });

            const keys = seededKeys(await visit());

            expect(mocks.fetchThemeCatalogue).not.toHaveBeenCalled();
            expect(keys).toEqual(expect.arrayContaining([bannerKeys[0]]));
        });

        it('leaves the catalogue to the client when the layout fails', async () => {
            mocks.serverGetOrNull.mockImplementation((path: string) =>
                path.endsWith('/feed-layout') ? Promise.reject(new Error('Server prefetch failed')) : Promise.resolve(null),
            );

            const keys = seededKeys(await visit());

            expect(mocks.fetchThemeCatalogue).not.toHaveBeenCalled();
            expect(keys).not.toEqual(expect.arrayContaining([bannerKeys[0]]));
            expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'usage']]));
        });

        it('keeps the layout and the catalogue when the stand-in theme fails', async () => {
            mocks.serverPublicGetOrNull.mockRejectedValue(new Error('Server fetch failed'));

            const keys = seededKeys(await visit());

            expect(keys).toEqual(expect.arrayContaining(bannerKeys.slice(0, 2)));
            expect(keys).not.toEqual(expect.arrayContaining([bannerKeys[2]]));
        });

        it('seeds the uploaded fonts when the picture draws in the stand-in theme', async () => {
            const element = await visit();
            const { state } = element.props as { state: DehydratedState };
            const fonts = state.queries.find((query) => query.queryKey.join('/') === adminInvitationThemeKeys.fonts.join('/'));

            expect(fonts?.state.data).toEqual(uploadedFonts);
        });

        it('seeds the uploaded fonts when the layout has its own Save my date theme', async () => {
            mocks.serverGetOrNull.mockImplementation((path: string) => Promise.resolve(path.endsWith('/feed-layout') ? ownThemeLayout : null));

            expect(seededKeys(await visit())).toEqual(expect.arrayContaining([adminInvitationThemeKeys.fonts]));
        });

        it('skips the uploaded fonts when the picture draws in the wall look', async () => {
            mocks.serverPublicGetOrNull.mockRejectedValue(new Error('Server fetch failed'));
            await visit();
            mocks.resolveServerEventDetail.mockResolvedValue({ ...bannerEvent, eventType: 'BIRTHDAY' });
            await visit();

            expect(mocks.fetchUploadedFonts).not.toHaveBeenCalled();
        });

        it('leaves the uploaded fonts to the client when none come back', async () => {
            mocks.fetchUploadedFonts.mockResolvedValue([]);

            const keys = seededKeys(await visit());

            expect(keys).toEqual(expect.arrayContaining(bannerKeys));
            expect(keys).not.toEqual(expect.arrayContaining([adminInvitationThemeKeys.fonts]));
        });

        it('seeds it for the main host of an event without Save my date, who may buy it', async () => {
            mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, memberships: [{ eventId: 'e1', id: 'm-main' }] });
            mocks.resolveServerEventDetail.mockResolvedValue({ ...bannerEvent, modules: liveEvent.modules });

            expect(seededKeys(await visit())).toEqual(expect.arrayContaining(bannerKeys));
        });

        it('skips it for a co-host of an event without Save my date', async () => {
            mocks.resolveServerEventContext.mockResolvedValue({ ...hostContext, memberships: [{ eventId: 'e1', id: 'm-co' }] });
            mocks.resolveServerEventDetail.mockResolvedValue({ ...bannerEvent, modules: liveEvent.modules });

            await visit();

            expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/feed-layout', 'token-1');
        });

        it('skips it without the feed editor, on another section and on a draft', async () => {
            mocks.showsFeedEditor.mockReturnValue(false);
            await visit();
            mocks.showsFeedEditor.mockReturnValue(true);
            await visit({ tab: 'members' });
            mocks.resolveServerEventDetail.mockResolvedValue({ ...bannerEvent, status: 'DRAFT' });
            await visit();

            expect(mocks.serverGetOrNull).not.toHaveBeenCalledWith('/api/events/e1/feed-layout', 'token-1');
            expect(mocks.fetchThemeCatalogue).not.toHaveBeenCalled();
        });
    });
});
