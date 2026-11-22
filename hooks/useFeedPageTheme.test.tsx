import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useEditPageTheme, useFeedPageTheme } from '@/hooks/useFeedPageTheme';
import type { EventDetailResponseDto, EventThemeDto } from '@/lib/api/types';
import { feedPageThemeFor, feedPageThemeSnapshot, publishFeedPageTheme } from '@/lib/feedPageTheme';

const dino: EventThemeDto = {
    presetKey: 'dino-mint',
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    titleColor: null,
    headingFont: null,
};
const event = { id: 'e-1', theme: dino } as unknown as EventDetailResponseDto;

afterEach(() => {
    publishFeedPageTheme('feed', null);
    publishFeedPageTheme('edit', null);
});

describe('useFeedPageTheme', () => {
    it('publishes nothing without a background colour', () => {
        const { result } = renderHook(() => useFeedPageTheme(event, null));
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')).toBeNull();
        expect(result.current).toBe(event);
    });

    it("puts the feed's background colour on the page, and clears it when the feed goes", () => {
        const { unmount } = renderHook(() => useFeedPageTheme(event, '#F5E6D3'));
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')?.theme?.backgroundColor).toBe('#F5E6D3');
        unmount();
        expect(feedPageThemeSnapshot().feed).toBeUndefined();
        expect(feedPageThemeSnapshot().edit).toBeUndefined();
    });

    it("draws the cover in edit mode's held preset, and drops it when edit mode closes", () => {
        const held: EventThemeDto = { ...dino, presetKey: 'rose', illustrationUrl: 'https://media.example/rose.webp' };
        const feed = renderHook(() => useFeedPageTheme(event, null));
        const edit = renderHook(() => useEditPageTheme('e-1', held, undefined));
        feed.rerender();
        expect(feed.result.current.theme).toEqual(held);
        edit.unmount();
        feed.rerender();
        expect(feed.result.current).toBe(event);
        expect(feedPageThemeSnapshot().feed).toBeUndefined();
        expect(feedPageThemeSnapshot().edit).toBeUndefined();
    });
});
