import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedTop } from '@/hooks/useFeedTop';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys, wallThemeDesign } from '@/lib/feedLayout';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { createFeedModeSection } from '@/lib/feedSections';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
const viewer = vi.hoisted(() => ({ isHost: false }));
vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => viewer.isHost }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

// An event that has ended: the read-only feed keeps only the cover and details.
const event = { id: 'e-1', theme: null, description: null, location: { name: null, address: null, mapsUrl: null }, schedule: { endAt: '2020-01-01T00:00:00Z' } } as unknown as EventDetailResponseDto;

const SMD = [{ moduleKey: 'save_my_date', isAvailable: true }];
const smdEvent = { ...event, modules: SMD } as unknown as EventDetailResponseDto;

// saved: the feed layout in the cache (null: nothing saved).
function wrapperWith(saved: FeedLayoutDto | null) {
    return function Wrapper({ children }: { children: ReactNode }) {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
        client.setQueryData(feedLayoutKeys.detail('e-1'), saved);
        return (
            <QueryClientProvider client={client}>
                <FeedEditorFlagProvider enabled>{children}</FeedEditorFlagProvider>
            </QueryClientProvider>
        );
    };
}

const wrapper = wrapperWith(null);

describe('useFeedTop while editing', () => {
    const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const base = defaultFeedLayout();
    const editing = produce({ ...base, sections: [...base.sections, dressCode] }, (draft) => {
        draft.sections[2].visible = false;
    });
    const theme = { ...wallThemeDesign(null), colors: { ...wallThemeDesign(null).colors, primary: '#123456' } };
    const media = () => 'https://example.test/held.jpg';

    it('draws the edited document with every block, never folded, even after the event', () => {
        const { result } = renderHook(() => useFeedTop(smdEvent, { document: editing, theme, media }), { wrapper });
        expect(result.current.frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'feed-feedRsvp', 'dress']);
        expect(result.current.frame.rsvp).toBeNull();
        expect(result.current.look).toBe(true);
        expect(result.current.sections).toBe(editing.sections);
    });

    it("leaves Save my date's sections out on an event without the module", () => {
        const prompt = { ...createFeedModeSection('feedPrompt', () => 'p'), visible: false };
        const document = { ...editing, sections: [...editing.sections, feedModuleSection('playlist', () => 'module'), prompt] };
        const { result } = renderHook(() => useFeedTop(event, { document, theme, media }), { wrapper });
        expect(result.current.frame.feed.map((section) => section.id)).toEqual(['p']);
        expect(result.current.sections.map((section) => section.type)).not.toContain('dressCode');
        expect(result.current.look).toBe(false);
    });

    it('draws everything but the feed sections as on the feed without Save my date: nothing else is edited there', () => {
        const open = { ...event, description: 'Hello', schedule: { endAt: null } } as unknown as EventDetailResponseDto;
        const frameOf = (shown: EventDetailResponseDto, document = base) =>
            renderHook(() => useFeedTop(shown, { document, theme, media }), { wrapper }).result.current.frame;
        expect(frameOf(open)).toMatchObject({ middle: [{ type: 'feedDescription' }], rsvp: { type: 'feedRsvp' } });
        // Hidden, empty or after the event: not drawn.
        expect(frameOf(open, editing).middle).toEqual([]);
        expect(frameOf({ ...open, description: null }).middle).toEqual([]);
        expect(frameOf({ ...event, description: 'Hello' })).toMatchObject({ middle: [], rsvp: null });
    });

    it('draws the held theme and its images, and the picked background colour', () => {
        const coloured = produce(editing, (draft) => {
            draft.overrides.backgroundColor = '#F5E6D3';
        });
        const { result } = renderHook(() => useFeedTop(event, { document: coloured, theme, media }), { wrapper });
        expect(result.current.ctx.theme).toBe(theme);
        expect(result.current.ctx.media('m-1')).toBe('https://example.test/held.jpg');
        expect(result.current.pageBackground).toBe('#F5E6D3');
    });

    it('keeps the read-only rules without it', () => {
        const { result } = renderHook(() => useFeedTop(event), { wrapper });
        expect(result.current.frame.middle).toEqual([]);
        expect(result.current.frame.rsvp).toBeNull();
        expect(result.current.pageBackground).toBeNull();
    });
});

describe('useFeedTop on the feed', () => {
    it("hands back the saved layout's background colour", () => {
        const document = produce(defaultFeedLayout(), (draft) => {
            draft.overrides.backgroundColor = '#F5E6D3';
        });
        const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document, design: null, imageUrls: {}, updatedAt: '2026-11-22T10:00:00Z' };
        const { result } = renderHook(() => useFeedTop(event), { wrapper: wrapperWith(saved) });
        expect(result.current.pageBackground).toBe('#F5E6D3');
    });
});

describe('useFeedTop and the Save my date module', () => {
    const faq = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'faq' };
    const prompt = createFeedModeSection('feedPrompt', () => 'p');
    const base = defaultFeedLayout();
    const document = { ...base, sections: [...base.sections, faq, feedModuleSection('playlist', () => 'module'), prompt] };
    const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document, design: null, imageUrls: {}, updatedAt: '2026-11-22T10:00:00Z' };
    const upcoming = (modules: string[]) =>
        ({
            ...event,
            schedule: { endAt: null },
            modules: modules.map((moduleKey) => ({ moduleKey, isAvailable: true })),
        }) as unknown as EventDetailResponseDto;
    const topOf = (modules: string[]) => renderHook(() => useFeedTop(upcoming(modules)), { wrapper: wrapperWith(saved) }).result.current;

    it('draws its sections and module blocks with it', () => {
        const top = topOf(['save_my_date', 'playlist']);
        expect(top.frame.middle.map((section) => section.id)).toEqual(['feed-feedRsvp', 'faq', 'module']);
        expect(top.frame.feed.map((section) => section.id)).toEqual(['p']);
        expect(top.look).toBe(true);
    });

    it('draws neither without it, only the feed sections', () => {
        const top = topOf(['playlist']);
        expect(top.frame.middle).toEqual([]);
        expect(top.sections.map((section) => section.id)).not.toContain('faq');
        expect(top.frame.feed.map((section) => section.id)).toEqual(['p']);
        expect(top.look).toBe(false);
    });
});

describe('useFeedTop on a Save my date theme', () => {
    const themed = { ...defaultFeedLayout(), themeId: 'olive' };
    const saved: FeedLayoutDto = {
        themeSlug: 'olive',
        revision: 2,
        document: themed,
        design: SAMPLE_THEME,
        imageUrls: { 'm-content': 'https://media.test/content.jpg' },
        updatedAt: '2026-11-22T10:00:00Z',
    };

    it("hands back the theme's backdrop and tells the renderer the page draws it", () => {
        const { result } = renderHook(() => useFeedTop(event), { wrapper: wrapperWith(saved) });
        expect(result.current.backdrop?.image?.desktop).toBe('https://media.test/content.jpg');
        expect(result.current.ctx.pageBackdrop).toBe(true);
    });

    it('has none on the wall theme', () => {
        const { result } = renderHook(() => useFeedTop(event), { wrapper });
        expect(result.current.backdrop).toBeNull();
        expect(result.current.ctx.pageBackdrop).toBeFalsy();
    });

    it('puts white text on a picture the backend says is dark', () => {
        const pageTone = { mean: 0.03, dark: 0.01, light: 0.08 };
        const { result } = renderHook(() => useFeedTop(event), { wrapper: wrapperWith({ ...saved, pageTone }) });
        expect(result.current.backdrop?.pictureTone).toEqual(pageTone);
        expect(result.current.ctx.textColor).toBe('#FFFFFF');
    });

    it('follows the theme held in edit mode', () => {
        const { result } = renderHook(() => useFeedTop(event, { document: themed, theme: SAMPLE_THEME, media: (id) => `https://held.test/${id}` }), { wrapper });
        expect(result.current.backdrop?.image?.desktop).toBe('https://held.test/m-content');
    });
});

describe('useFeedTop and a schedule with no sessions', () => {
    afterEach(() => {
        viewer.isHost = false;
    });

    const base = defaultFeedLayout();
    const document = {
        ...base,
        sections: [base.sections[0], feedModuleSection('schedule', () => 'module'), createFeedModeSection('feedSchedule', () => 'today')],
    };
    const saved: FeedLayoutDto = { themeSlug: null, revision: 3, document, design: null, imageUrls: {}, updatedAt: '2026-11-22T10:00:00Z' };
    const church = { id: 'church', title: 'Church', startAt: '2030-06-20T16:00:00Z', endAt: null, deletedAt: null };
    const eventWith = (over: object = {}) =>
        ({
            ...event,
            modules: ['save_my_date', 'schedule'].map((moduleKey) => ({ moduleKey, isAvailable: true })),
            schedule: { startAt: '2030-06-20T16:00:00Z', timezone: 'Europe/Athens', endAt: null },
            sessions: [],
            ...over,
        }) as unknown as EventDetailResponseDto;
    const idsOf = (shown: EventDetailResponseDto, asGuest?: boolean) => {
        const editing = asGuest === undefined ? undefined : { document, theme: wallThemeDesign(null), media: () => undefined, asGuest };
        const { frame } = renderHook(() => useFeedTop(shown, editing), { wrapper: wrapperWith(saved) }).result.current;
        return [...frame.middle, ...frame.feed].map((section) => section.id);
    };

    it('leaves both schedule blocks out for guests', () => {
        expect(idsOf(eventWith())).toEqual([]);
    });

    it('keeps both for hosts, on the feed and in edit mode, but not in the guest preview', () => {
        viewer.isHost = true;
        expect(idsOf(eventWith())).toEqual(['module', 'today']);
        expect(idsOf(eventWith(), false)).toEqual(['module', 'today']);
        expect(idsOf(eventWith(), true)).toEqual([]);
    });

    it('keeps both for everyone once a session has a time', () => {
        expect(idsOf(eventWith({ sessions: [church] }))).toEqual(['module', 'today']);
        expect(idsOf(eventWith({ sessions: [{ ...church, startAt: null }] }))).toEqual([]);
    });

    it('leaves both out once the last session is over, but keeps them in edit mode (KAN-293)', () => {
        viewer.isHost = true;
        const past = eventWith({ sessions: [{ ...church, startAt: '2021-06-20T16:00:00Z', endAt: '2021-06-20T17:00:00Z' }] });
        expect(idsOf(past)).toEqual([]);
        expect(idsOf(past, false)).toEqual(['module', 'today']);
    });

    it("leaves the host's card out after the event", () => {
        viewer.isHost = true;
        expect(idsOf(eventWith({ schedule: { startAt: '2020-01-01T00:00:00Z', timezone: 'Europe/Athens', endAt: '2020-01-02T00:00:00Z' } }))).toEqual([]);
    });
});

describe("useFeedTop and the theme's framed photo", () => {
    const base = defaultFeedLayout();
    const PHOTO = { source: 'media', mediaId: 'mine' };
    const framed = (photo: unknown) => {
        const section = createSection('photoFrame', 'WEDDING', () => 'framed');
        return { ...section, elements: section.elements.map((element) => ({ ...element, frameId: 'fr-oval', photo })) } as InvitationSection;
    };
    const open = { ...smdEvent, schedule: { endAt: null } } as unknown as EventDetailResponseDto;
    const media = (id: string) => `/${id}`;
    const draws = (section: InvitationSection, { theme = SAMPLE_THEME, asGuest = false }) => {
        const document = { ...base, sections: [...base.sections, section] };
        const { result } = renderHook(() => useFeedTop(open, { document, theme, media, asGuest }), { wrapper });
        return result.current.frame.middle.some((item) => item.id === 'framed');
    };

    it('shows the host its empty place, and guests nothing until a photo is in it', () => {
        expect(draws(framed(undefined), {})).toBe(true);
        expect(draws(framed(undefined), { asGuest: true })).toBe(false);
        expect(draws(framed(PHOTO), { asGuest: true })).toBe(true);
    });

    it('shows nobody anything on a theme without its frame', () => {
        const theme = { ...SAMPLE_THEME, frames: [] };
        expect(draws(framed(PHOTO), { theme })).toBe(false);
        expect(draws(framed(PHOTO), { theme, asGuest: true })).toBe(false);
    });
});
