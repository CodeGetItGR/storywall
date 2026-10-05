import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { useThemePicker } from '@/hooks/useThemePicker';
import type { EventDetailResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    presetsArg: undefined as string | null | undefined,
    preset: {
        id: 'p1',
        key: 'dino-mint',
        name: { en: 'Dino', el: 'Δεινόσαυρος' },
        backgroundColor: '#BFE6E2',
        illustrationUrl: 'https://media.example/dino.webp',
    },
    mutate: (() => undefined) as (presetId: string | null) => void,
    mutation: { isPending: false, variables: undefined as string | null | undefined, error: null as unknown },
    presetsError: null as unknown,
}));

vi.mock('@/hooks/useEventTheme', () => ({
    useEventThemePresets: (eventId: string | null) => {
        mocks.presetsArg = eventId;
        return { data: eventId ? [mocks.preset] : undefined, isLoading: false, error: mocks.presetsError };
    },
    useSetEventTheme: () => ({ mutate: mocks.mutate, ...mocks.mutation }),
}));

function eventWith(themeAvailable: boolean, presetKey: string | null = 'dino-mint') {
    return {
        id: 'e1',
        modules: [{ moduleKey: 'theme', isAvailable: themeAvailable, isEnabled: true }],
        theme: presetKey ? { presetKey, backgroundColor: '#BFE6E2', illustrationUrl: 'https://media.example/dino.webp' } : null,
    } as unknown as EventDetailResponseDto;
}

beforeEach(() => {
    mocks.presetsArg = undefined;
    mocks.presetsError = null;
    mocks.mutate = vi.fn();
    mocks.mutation = { isPending: false, variables: undefined, error: null };
});

describe('useThemePicker', () => {
    it("is hidden and fetches nothing when the plan doesn't include themes", () => {
        const { result } = renderHook(() => useThemePicker(eventWith(false), true));
        expect(result.current.available).toBe(false);
        expect(mocks.presetsArg).toBeNull();
    });

    it("lists the presets and marks the event's current one", () => {
        const { result } = renderHook(() => useThemePicker(eventWith(true), true));
        expect(result.current.available).toBe(true);
        expect(mocks.presetsArg).toBe('e1');
        expect(result.current.presets).toEqual([mocks.preset]);
        expect(result.current.selectedKey).toBe('dino-mint');
    });

    it('selects "No theme" when the event has none', () => {
        const { result } = renderHook(() => useThemePicker(eventWith(true, null), true));
        expect(result.current.selectedKey).toBeNull();
    });

    it('saves a pick, including clearing with null', () => {
        const { result } = renderHook(() => useThemePicker(eventWith(true), true));
        act(() => result.current.select('p1'));
        act(() => result.current.select(null));
        expect(mocks.mutate).toHaveBeenNthCalledWith(1, 'p1');
        expect(mocks.mutate).toHaveBeenNthCalledWith(2, null);
    });

    it('does not save when the event is read-only', () => {
        const { result } = renderHook(() => useThemePicker(eventWith(true), false));
        act(() => result.current.select('p1'));
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(result.current.disabled).toBe(true);
    });

    it('reports which option is saving and blocks another pick meanwhile', () => {
        mocks.mutation = { isPending: true, variables: 'p1', error: null };
        const { result } = renderHook(() => useThemePicker(eventWith(true, null), true));
        expect(result.current.isSaving).toBe(true);
        expect(result.current.savingPresetId).toBe('p1');
        act(() => result.current.select(null));
        expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it.each([5144, 5012])('goes quiet, with no error, when the presets answer %i (event ended / module gone)', (errorCode) => {
        mocks.presetsError = new ApiError(409, { errorCode });
        const { result } = renderHook(() => useThemePicker(eventWith(true), true));
        expect(result.current.available).toBe(false);
        expect(result.current.loadError).toBeNull();
    });

    it('still surfaces other preset load errors', () => {
        mocks.presetsError = new ApiError(500, { errorCode: 5004 });
        const { result } = renderHook(() => useThemePicker(eventWith(true), true));
        expect(result.current.available).toBe(true);
        expect(result.current.loadError).toBe(mocks.presetsError);
    });
});
