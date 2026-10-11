import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { heOrSheKeys, useCreateHeOrSheQuestion, useHeOrShe, useHeOrSheResults, useSendHeOrSheAnswers, useUpdateHeOrSheSettings } from '@/hooks/useHeOrShe';
import { endpoints } from '@/lib/api/endpoints';
import type { HeOrSheViewDto } from '@/lib/api/types';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        put: (...a: unknown[]) => apiPut(...a),
    },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const moduleState = { readable: true };
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => moduleState.readable }));

function view(overrides: Partial<HeOrSheViewDto> = {}): HeOrSheViewDto {
    return {
        status: 'OPEN',
        closesAt: null,
        canGuess: true,
        myGuess: null,
        tally: null,
        questions: [],
        myAnswers: {},
        ...overrides,
    };
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

describe('useHeOrShe', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPost.mockReset();
        apiPut.mockReset();
        moduleState.readable = true;
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('reads the view under the exported key', async () => {
        apiGet.mockResolvedValue(view());
        const { result } = renderHook(() => useHeOrShe('e1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(apiGet).toHaveBeenCalledWith(endpoints.events.heOrShe('e1'));
        expect(client.getQueryData(heOrSheKeys.view('e1'))).toEqual(view());
    });

    it('does not fetch when the module is not readable', () => {
        moduleState.readable = false;
        renderHook(() => useHeOrShe('e1'), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('refetches when the closing time passes', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const closesAt = new Date(Date.now() + 5_000).toISOString();
        apiGet.mockResolvedValueOnce(view({ closesAt })).mockResolvedValue(view({ closesAt, status: 'CLOSED', canGuess: false }));
        const { result } = renderHook(() => useHeOrShe('e1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.data?.status).toBe('OPEN'));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(6_500);
        });

        await waitFor(() => expect(result.current.data?.status).toBe('CLOSED'));
        expect(apiGet).toHaveBeenCalledTimes(2);
    });

    it('sets no timer once closed', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        apiGet.mockResolvedValue(view({ status: 'CLOSED', closesAt: new Date(Date.now() + 5_000).toISOString() }));
        renderHook(() => useHeOrShe('e1'), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });
        expect(apiGet).toHaveBeenCalledTimes(1);
    });
});

describe('he-or-she writes', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiGet.mockReset();
        apiPost.mockReset();
        apiPut.mockReset();
        moduleState.readable = true;
    });

    it('puts the returned view straight into the cache after answering', async () => {
        const updated = view({ myGuess: 'HE', tally: { he: 1, she: 0 } });
        apiPut.mockResolvedValue(updated);
        const { result } = renderHook(() => useSendHeOrSheAnswers('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ guess: 'HE', answers: [] }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.events.heOrSheAnswers('e1'), { guess: 'HE', answers: [] });
        expect(client.getQueryData(heOrSheKeys.view('e1'))).toEqual(updated);
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('sends only the closing time in the settings', async () => {
        const closesAt = '2026-11-01T18:00:00.000Z';
        const updated = view({ closesAt });
        apiPut.mockResolvedValue(updated);
        const { result } = renderHook(() => useUpdateHeOrSheSettings('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ closesAt }));

        expect(apiPut).toHaveBeenCalledWith(endpoints.events.heOrSheSettings('e1'), { closesAt });
        expect(client.getQueryData(heOrSheKeys.view('e1'))).toEqual(updated);
    });

    it('refetches the view and the results after a question write', async () => {
        client.setQueryData(heOrSheKeys.view('e1'), view());
        client.setQueryData(heOrSheKeys.results('e1'), { main: [], questions: [] });
        apiPost.mockResolvedValue({ id: 'q1' });
        const { result } = renderHook(() => useCreateHeOrSheQuestion('e1'), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ answerType: 'YES_NO', prompt: 'Early?' }));

        expect(client.getQueryState(heOrSheKeys.view('e1'))?.isInvalidated).toBe(true);
        expect(client.getQueryState(heOrSheKeys.results('e1'))?.isInvalidated).toBe(true);
    });

    it('reads results for hosts only', () => {
        renderHook(() => useHeOrSheResults('e1', false), { wrapper: wrapperFor(client) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});
