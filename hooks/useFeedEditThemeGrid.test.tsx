import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import type { EventDetailResponseDto, EventThemeDto, ThemePresetDto } from '@/lib/api/types';
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
    useNoThemeCard: (look: EventThemeDto | null, selected: boolean) => ({
        id: 'none',
        presetId: null,
        label: 'none',
        backgroundColor: look?.backgroundColor ?? null,
        illustrationUrl: look?.illustrationUrl ?? null,
        titleColor: look?.titleColor ?? null,
        headingFont: look?.headingFont ?? null,
        selected,
    }),
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
        // Only the Save my date card sits on the light neutral.
        expect(result.current.options.map((option) => option.neutralSwatch ?? false)).toEqual([false, false, true]);
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

    describe('without wall themes (no theme module)', () => {
        const dino: EventThemeDto = { presetKey: 'dino-mint', backgroundColor: '#BFE6E2', illustrationUrl: 'u', titleColor: '#123456', headingFont: null };
        const themed = { ...event, theme: dino } as EventDetailResponseDto;
        beforeEach(() => {
            mocks.available = false;
        });

        it("offers just 'No theme' before the Save my date themes, in the event's current wall look", () => {
            const { result } = renderHook(() => useFeedEditThemeGrid(themed, session({ themeSlug: 'rose' })));
            expect(result.current.options.map((option) => option.id)).toEqual(['none', invitationThemeChoice('rose')]);
            expect(result.current.options[0]).toMatchObject({ presetId: null, backgroundColor: '#BFE6E2', illustrationUrl: 'u', titleColor: '#123456', selected: false });
        });

        it('draws the plain look for an event with no wall theme, selected on the wall', () => {
            const { result } = renderHook(() => useFeedEditThemeGrid({ ...event, theme: null } as EventDetailResponseDto, session()));
            expect(result.current.options[0]).toMatchObject({ id: 'none', backgroundColor: null, illustrationUrl: null, selected: true });
        });

        it("holds a switch back to the event's own wall look, leaving its theme as it is", () => {
            const pickWall = vi.fn();
            const { result } = renderHook(() => useFeedEditThemeGrid(themed, session({ themeSlug: 'rose', pickWall })));
            act(() => result.current.select(null));
            expect(pickWall).toHaveBeenCalledWith(null, dino, true);
            act(() => result.current.select('p-1'));
            expect(pickWall).toHaveBeenCalledOnce();
        });
    });
});
