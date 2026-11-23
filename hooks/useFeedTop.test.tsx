import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedTop } from '@/hooks/useFeedTop';
import type { EventDetailResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys, wallThemeDesign } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

// An event that has ended: the read-only feed keeps only the cover and details.
const event = { id: 'e-1', theme: null, description: null, schedule: { endAt: '2020-01-01T00:00:00Z' } } as unknown as EventDetailResponseDto;

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
        const { result } = renderHook(() => useFeedTop(event, { document: editing, theme, media }), { wrapper });
        expect(result.current.frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(result.current.frame.rsvp?.type).toBe('feedRsvp');
        expect(result.current.folds).toBe(false);
        expect(result.current.look).toBe(true);
        expect(result.current.sections).toBe(editing.sections);
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
        expect(result.current.ctx.pageBackdrop).toBe(false);
    });

    it('follows the theme held in edit mode', () => {
        const { result } = renderHook(() => useFeedTop(event, { document: themed, theme: SAMPLE_THEME, media: (id) => `https://held.test/${id}` }), { wrapper });
        expect(result.current.backdrop?.image?.desktop).toBe('https://held.test/m-content');
    });
});
