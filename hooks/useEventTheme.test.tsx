import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import { eventThemeKeys, useEventThemePresets, useSetEventTheme } from '@/hooks/useEventTheme';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES } from '@/lib/api/errors';

const apiGet = vi.fn();
const apiPut = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...a: unknown[]) => apiGet(...a), put: (...a: unknown[]) => apiPut(...a) },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const PRESET = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
};

const THEME = { presetKey: 'dino-mint', backgroundColor: '#BFE6E2', illustrationUrl: PRESET.illustrationUrl };

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

let client: QueryClient;

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    apiGet.mockReset();
    apiPut.mockReset();
});

describe('useEventThemePresets', () => {
    it("fetches the event's presets in the order the server sends them", async () => {
        apiGet.mockResolvedValue([PRESET]);
        const { result } = renderHook(() => useEventThemePresets('e1'), { wrapper: wrapperFor(client) });

        await waitFor(() => expect(result.current.data).toEqual([PRESET]));
        expect(apiGet).toHaveBeenCalledWith(endpoints.events.themePresets('e1'));
        expect(eventThemeKeys.presets('e1')).toEqual(['events', 'e1', 'theme-presets']);
    });

    it('does not fetch without an event', () => {
        renderHook(() => useEventThemePresets(null), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('useSetEventTheme', () => {
    it('sends the preset and merges the returned theme into the cached event detail', async () => {
        client.setQueryData(eventKeys.detail('e1'), { id: 'e1', title: 'Party', theme: null });
        apiPut.mockResolvedValue({ theme: THEME });
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('p1'));

        expect(apiPut).toHaveBeenCalledWith(endpoints.events.theme('e1'), { presetId: 'p1' });
        expect(client.getQueryData(eventKeys.detail('e1'))).toEqual({ id: 'e1', title: 'Party', theme: THEME });
    });

    it('leaves the cache alone when the event detail is not cached', async () => {
        apiPut.mockResolvedValue({ theme: THEME });
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('p1'));

        expect(client.getQueryData(eventKeys.detail('e1'))).toBeUndefined();
    });

    it('clears the theme with null', async () => {
        client.setQueryData(eventKeys.detail('e1'), { id: 'e1', theme: THEME });
        apiPut.mockResolvedValue({ theme: null });
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync(null));

        expect(apiPut).toHaveBeenCalledWith(endpoints.events.theme('e1'), { presetId: null });
        expect(client.getQueryData(eventKeys.detail('e1'))).toEqual({ id: 'e1', theme: null });
    });

    it('does not refetch /api/me/events, whose rows carry no theme', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        apiPut.mockResolvedValue({ theme: THEME });
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('p1'));

        expect(invalidate).not.toHaveBeenCalled();
    });

    it('refetches the presets when the picked one is no longer selectable (5143)', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        apiPut.mockRejectedValue(new ApiError(409, { errorCode: ERROR_CODES.THEME_PRESET_NOT_SELECTABLE }));
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('p1').catch(() => undefined));

        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: eventThemeKeys.presets('e1') });
    });

    it.each([ERROR_CODES.EVENT_ENDED, ERROR_CODES.MODULE_NOT_AVAILABLE])(
        'refetches the event and presets on %s so the picker goes quiet',
        async (code) => {
            const invalidate = vi.spyOn(client, 'invalidateQueries');
            apiPut.mockRejectedValue(new ApiError(409, { errorCode: code }));
            const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

            await act(() => result.current.mutateAsync('p1').catch(() => undefined));

            expect(invalidate).toHaveBeenCalledWith({ queryKey: eventKeys.detail('e1') });
            expect(invalidate).toHaveBeenCalledWith({ queryKey: eventThemeKeys.presets('e1') });
        },
    );

    it('leaves the cache alone for other failures', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        apiPut.mockRejectedValue(new ApiError(500, { errorCode: 1000 }));
        const { result } = renderHook(() => useSetEventTheme('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('p1').catch(() => undefined));

        expect(invalidate).not.toHaveBeenCalled();
    });
});
