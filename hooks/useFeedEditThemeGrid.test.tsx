import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import type { EventDetailResponseDto, ThemePresetDto } from '@/lib/api/types';
import { invitationThemeChoice } from '@/lib/feedThemes';

const preset: ThemePresetDto = {
    id: 'p-1',
    key: 'dino-mint',
    name: { el: 'Δ', en: 'D' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'u',
    titleColor: null,
    headingFont: null,
};

const mocks = vi.hoisted(() => ({ applied: null as string | null, available: true }));

vi.mock('@/hooks/useThemePicker', () => ({
    useThemePicker: () => ({
        available: mocks.available,
        presets: [preset],
        isLoading: false,
        isApplied: (presetId: string | null) => presetId === mocks.applied,
    }),
}));
vi.mock('@/hooks/useWallThemeOptions', () => ({
    useWallThemeOptions: (_picker: unknown, { checkable }: { checkable: boolean }) => [
        {
            id: 'none',
            presetId: null,
            label: 'none',
            backgroundColor: null,
            illustrationUrl: null,
            titleColor: null,
            headingFont: null,
            selected: checkable && mocks.applied === null,
        },
        {
            id: 'p-1',
            presetId: 'p-1',
            label: 'D',
            backgroundColor: '#BFE6E2',
            illustrationUrl: 'u',
            titleColor: null,
            headingFont: null,
            selected: checkable && mocks.applied === 'p-1',
        },
    ],
}));
vi.mock('@/hooks/useInvitationThemeCards', () => ({
    useInvitationThemeCards: () => ({
        cards: [{ slug: 'rose', name: 'Rose', cardColor: '#EED', illustrationUrl: null, titleFontFamily: null, titleColor: null }],
        fontFaces: '',
        isLoading: false,
    }),
}));

const event = { id: 'e-1', eventType: 'WEDDING', title: 'Wedding' } as unknown as EventDetailResponseDto;

function session(overrides: Partial<Parameters<typeof useFeedEditThemeGrid>[1]> = {}) {
    return { themeSlug: '', heldWall: undefined, switching: false, saving: false, pickInvitation: vi.fn(), pickWall: vi.fn(), ...overrides };
}

beforeEach(() => {
    mocks.applied = null;
    mocks.available = true;
});

describe('useFeedEditThemeGrid', () => {
    it('lists the wall themes, then the Save my date themes', () => {
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session()));
        expect(result.current.options.map((option) => option.id)).toEqual(['none', 'p-1', invitationThemeChoice('rose')]);
    });

    it('marks the held pick', () => {
        const held = renderHook(() => useFeedEditThemeGrid(event, session({ heldWall: { presetId: 'p-1', theme: null } }))).result.current;
        expect(held.options.find((option) => option.selected)?.id).toBe('p-1');
        const rose = renderHook(() => useFeedEditThemeGrid(event, session({ themeSlug: 'rose' }))).result.current;
        expect(rose.options.filter((option) => option.selected).map((option) => option.id)).toEqual([invitationThemeChoice('rose')]);
    });

    it('sends a Save my date pick and a wall pick to the session', () => {
        const pickInvitation = vi.fn();
        const pickWall = vi.fn();
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session({ pickInvitation, pickWall })));
        act(() => result.current.select(invitationThemeChoice('rose')));
        expect(pickInvitation).toHaveBeenCalledWith('rose');
        act(() => result.current.select('p-1'));
        expect(pickWall).toHaveBeenCalledWith('p-1', expect.objectContaining({ presetKey: 'dino-mint' }), false);
        act(() => result.current.select(null));
        expect(pickWall).toHaveBeenLastCalledWith(null, null, true);
    });

    it('leaves the wall themes out when the event cannot pick one', () => {
        mocks.available = false;
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session()));
        expect(result.current.options.map((option) => option.id)).toEqual([invitationThemeChoice('rose')]);
    });
});
