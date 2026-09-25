import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rsvpKeys, useCreateRsvpSessionResponse, useUpdateRsvpSessionResponse } from '@/hooks/useRsvps';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';

const apiPost = vi.fn();
const apiPatch = vi.fn();
// Keeps the real ApiError class (isProblemDetail-based `problem` parsing) so
// isRsvpNotAttendingError works against these mocked rejections; only `api` is stubbed.
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        post: (...a: unknown[]) => apiPost(...a),
        patch: (...a: unknown[]) => apiPatch(...a),
    },
}));

function apiError(errorCode: number, status = 409) {
    return new ApiError(status, { errorCode });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

const EVENT_ID = 'event-1';
const RSVP_ID = 'rsvp-1';

beforeEach(() => {
    apiPost.mockReset();
    apiPatch.mockReset();
});

describe('useCreateRsvpSessionResponse', () => {
    it('invalidates the cached RSVP on 5087 (declined elsewhere)', async () => {
        apiPost.mockRejectedValue(apiError(ERROR_CODES.RSVP_NOT_ATTENDING));
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useCreateRsvpSessionResponse(EVENT_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await expect(
                result.current.mutateAsync({ rsvpId: RSVP_ID, eventSessionId: 'session-1', isAttending: true }),
            ).rejects.toThrow();
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: rsvpKeys.detail(RSVP_ID) });
    });

    it('does not invalidate the cached RSVP on other errors', async () => {
        apiPost.mockRejectedValue(apiError(ERROR_CODES.VALIDATION_FAILED, 400));
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useCreateRsvpSessionResponse(EVENT_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await expect(
                result.current.mutateAsync({ rsvpId: RSVP_ID, eventSessionId: 'session-1', isAttending: true }),
            ).rejects.toThrow();
        });

        expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: rsvpKeys.detail(RSVP_ID) });
    });
});

describe('useUpdateRsvpSessionResponse', () => {
    it('invalidates the cached RSVP on 5087 (declined elsewhere)', async () => {
        apiPatch.mockRejectedValue(apiError(ERROR_CODES.RSVP_NOT_ATTENDING));
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useUpdateRsvpSessionResponse(EVENT_ID, RSVP_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await expect(result.current.mutateAsync({ id: 'response-1', input: { isAttending: false } })).rejects.toThrow();
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: rsvpKeys.detail(RSVP_ID) });
    });

    it('does not invalidate the cached RSVP on other errors', async () => {
        apiPatch.mockRejectedValue(apiError(ERROR_CODES.VALIDATION_FAILED, 400));
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useUpdateRsvpSessionResponse(EVENT_ID, RSVP_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await expect(result.current.mutateAsync({ id: 'response-1', input: { isAttending: false } })).rejects.toThrow();
        });

        expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: rsvpKeys.detail(RSVP_ID) });
    });
});
