import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeGrid } from '@/hooks/useThemeGrid';
import type { EventDetailResponseDto } from '@/lib/api/types';

const m = vi.hoisted(() => ({
    picker: {} as Record<string, unknown>,
    layout: { document: {}, revision: 3, themeSlug: null as string | null, isLoading: false },
    cards: [] as unknown[],
    switchTo: (async () => true) as (slug: string | null) => Promise<boolean>,
    primaryHost: true,
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useThemePicker', () => ({ useThemePicker: () => m.picker }));
vi.mock('@/hooks/useFeedLayout', () => ({ useFeedLayout: () => m.layout }));
vi.mock('@/hooks/useInvitationThemeCards', () => ({ useInvitationThemeCards: () => ({ cards: m.cards, fontFaces: '', isLoading: false }) }));
vi.mock('@/hooks/useFeedThemeSwitch', () => ({
    useFeedThemeSwitch: () => ({ switchTo: m.switchTo, isSaving: false, isSaved: false, error: null }),
}));
vi.mock('@/hooks/usePlanUpgradeHref', () => ({ usePlanUpgradeHref: () => (m.primaryHost ? '/events/e1/manage?tab=plan' : null) }));

const PRESET = { id: 'p1', key: 'dino-mint', name: { en: 'Dino' }, backgroundColor: '#BFE6E2', illustrationUrl: null, titleColor: null, headingFont: null };
const ROSE = { slug: 'rose', name: 'Rose', cardColor: '#FBE6E4', illustrationUrl: null, titleFontFamily: 'Georgia, serif', titleColor: '#9C4A5A' };

function eventWith(saveMyDate: boolean) {
    return { id: 'e1', eventType: 'WEDDING', modules: [{ moduleKey: 'save_my_date', isAvailable: saveMyDate }] } as unknown as EventDetailResponseDto;
}

beforeEach(() => {
    m.picker = {
        available: true,
        presets: [PRESET],
        isLoading: false,
        loadError: null,
        selectedKey: 'dino-mint',
        staleTheme: null,
        isSaving: false,
        isSaved: false,
        savingPresetId: null,
        saveError: null,
        disabled: false,
        select: vi.fn(),
        isApplied: (presetId: string | null) => presetId === 'p1',
    };
    m.layout = { document: {}, revision: 3, themeSlug: null, isLoading: false };
    m.cards = [ROSE];
    m.switchTo = vi.fn(async () => true);
    m.primaryHost = true;
});

const optionNamed = (options: { label: string }[], label: string) => options.find((option) => option.label === label) as Record<string, unknown>;

describe('useThemeGrid', () => {
    it('lists the wall themes, then the Save my date themes', () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        expect(result.current.options.map((option) => option.label)).toEqual(['none', 'Dino', 'Rose']);
        expect(optionNamed(result.current.options, 'Dino').selected).toBe(true);
        expect(optionNamed(result.current.options, 'Rose')).toMatchObject({ presetId: 'invitation:rose', titleFontFamily: 'Georgia, serif', locked: false });
    });

    it('checks the Save my date theme the feed is on, and no wall theme', () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        expect(result.current.options.filter((option) => option.selected).map((option) => option.label)).toEqual(['Rose']);
    });

    it('moves the feed onto a Save my date theme', async () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select('invitation:rose'));
        expect(m.switchTo).toHaveBeenCalledWith('rose');
        expect(m.picker.select).not.toHaveBeenCalled();
    });

    it('picks a wall theme as today while the feed is on the wall theme', async () => {
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select(null));
        expect(m.picker.select).toHaveBeenCalledWith(null);
        expect(m.switchTo).not.toHaveBeenCalled();
    });

    it('moves the feed back first, then saves a wall theme not yet on the event', async () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select(null));
        expect(m.switchTo).toHaveBeenCalledWith(null);
        expect(m.picker.select).toHaveBeenCalledWith(null);
    });

    it("doesn't save a wall theme that is already on the event", async () => {
        m.layout = { ...m.layout, themeSlug: 'rose' };
        const { result } = renderHook(() => useThemeGrid(eventWith(true), true, vi.fn()));
        await act(() => result.current.select('p1'));
        expect(m.switchTo).toHaveBeenCalledWith(null);
        expect(m.picker.select).not.toHaveBeenCalled();
    });

    it('locks Save my date themes without the module, and the main host goes to Billing', async () => {
        const openBilling = vi.fn();
        const { result } = renderHook(() => useThemeGrid(eventWith(false), true, openBilling));
        expect(optionNamed(result.current.options, 'Rose')).toMatchObject({ locked: true, lockedLabel: 'locked', presetId: 'invitation:rose' });
        await act(() => result.current.select('invitation:rose'));
        expect(openBilling).toHaveBeenCalled();
        expect(m.switchTo).not.toHaveBeenCalled();
    });

    it("gives co-hosts a locked card they can't pick", () => {
        m.primaryHost = false;
        const { result } = renderHook(() => useThemeGrid(eventWith(false), true, vi.fn()));
        expect(optionNamed(result.current.options, 'Rose').presetId).toBeUndefined();
    });
});
