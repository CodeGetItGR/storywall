import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePartnerBrandingConsent } from '@/hooks/usePartnerBrandingConsent';
import { usePartnerBrandingPrompt } from '@/hooks/usePartnerBrandingPrompt';
import { ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const apiPost = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: (...a: unknown[]) => apiPost(...a) },
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));

const notice = { displayName: 'Barn Venue', noticeVersion: 'v1' };

function tick(checked: boolean) {
    return { target: { checked } } as ChangeEvent<HTMLInputElement>;
}

describe('usePartnerBrandingConsent', () => {
    it('needs nothing when the code has no partner notice', () => {
        const { result } = renderHook(() => usePartnerBrandingConsent(null));
        expect(result.current.satisfied).toBe(true);
        expect(result.current.requestFields).toEqual({});
    });

    it('holds checkout until the box is ticked, then sends the shown version', () => {
        const { result } = renderHook(() => usePartnerBrandingConsent(notice));
        expect(result.current.satisfied).toBe(false);

        act(() => result.current.handleChange(tick(true)));

        expect(result.current.satisfied).toBe(true);
        expect(result.current.requestFields).toEqual({ acceptsPartnerBranding: true, partnerBrandingNoticeVersion: 'v1' });
    });

    it('asks again for another notice', () => {
        const { result, rerender } = renderHook(({ current }) => usePartnerBrandingConsent(current), { initialProps: { current: notice } });
        act(() => result.current.handleChange(tick(true)));

        rerender({ current: { ...notice, noticeVersion: 'v2' } });

        expect(result.current.accepted).toBe(false);
        expect(result.current.satisfied).toBe(false);
    });
});

describe('usePartnerBrandingPrompt', () => {
    let client: QueryClient;
    function wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiPost.mockReset();
    });

    it('accepts the shown version and reloads the event', async () => {
        apiPost.mockResolvedValue(undefined);
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => usePartnerBrandingPrompt('ev1', notice), { wrapper });

        act(() => result.current.accept());

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'ev1'] }));
        expect(apiPost).toHaveBeenCalledWith(endpoints.events.partnerBrandingAcceptance('ev1'), { noticeVersion: 'v1' });
    });

    it('declines without a body', async () => {
        apiPost.mockResolvedValue(undefined);
        const { result } = renderHook(() => usePartnerBrandingPrompt('ev1', notice), { wrapper });

        act(() => result.current.decline());

        await waitFor(() => expect(apiPost).toHaveBeenCalledWith(endpoints.events.partnerBrandingDecline('ev1')));
    });

    it('reloads the event without an error when the notice changed (5153)', async () => {
        apiPost.mockRejectedValue(new ApiError(409, { errorCode: 5153 }));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => usePartnerBrandingPrompt('ev1', notice), { wrapper });

        act(() => result.current.accept());

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'ev1'] }));
        expect(result.current.error).toBeNull();
        expect(result.current.open).toBe(true);
    });

    it('stays pending but hides once closed without an answer', () => {
        const { result } = renderHook(() => usePartnerBrandingPrompt('ev1', notice), { wrapper });

        act(() => result.current.dismiss());

        expect(result.current.open).toBe(false);
        expect(apiPost).not.toHaveBeenCalled();
    });
});
