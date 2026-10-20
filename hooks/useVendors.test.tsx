import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    useEventVendors,
    useHasVendorCapability,
    useMyVendorRole,
    usePatchVendor,
    useRecordVendorClick,
    useRemoveVendor,
    useResetVendorLink,
    useVendorLinks,
    vendorKeys,
} from '@/hooks/useVendors';
import { ApiError } from '@/lib/api/client';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        patch: (...a: unknown[]) => apiPatch(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const readable = vi.hoisted(() => ({ vendors: true }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => readable.vendors }));

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

const ME = {
    vendorId: 'v1',
    vendorType: 'MUSIC',
    capabilities: ['SONG_REQUESTS'],
    accessEndsAt: null,
    accessOpen: true,
    profileComplete: true,
    showPartnerPrompt: false,
    proStorageBytes: null,
    proUsedBytes: null,
    optedOut: false,
    hiddenByHost: false,
    toolsOff: null,
};

beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiDel.mockReset();
    readable.vendors = true;
});

describe('vendorKeys', () => {
    it('nests every vendor key under the event', () => {
        expect(vendorKeys.links('e1')).toEqual(['events', 'e1', 'vendors', 'links']);
        expect(vendorKeys.list('e1')).toEqual(['events', 'e1', 'vendors', 'list']);
        expect(vendorKeys.me('e1')).toEqual(['events', 'e1', 'vendors', 'me']);
    });
});

describe('useMyVendorRole', () => {
    it('returns the role', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual(ME));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors/me');
    });

    it('reads a 404 as not a vendor', async () => {
        apiGet.mockRejectedValue(new ApiError(404, {}));
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
        expect(result.current.isError).toBe(false);
    });

    it('surfaces other errors', async () => {
        apiGet.mockRejectedValue(new ApiError(500, {}));
        const { result } = renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('does not ask without the module or an event', () => {
        readable.vendors = false;
        renderHook(() => useMyVendorRole('e1'), { wrapper: wrapperFor(newClient()) });
        readable.vendors = true;
        renderHook(() => useMyVendorRole(null), { wrapper: wrapperFor(newClient()) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('useHasVendorCapability', () => {
    it('is true for the DJ and song requests', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useHasVendorCapability('e1', 'SONG_REQUESTS'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.allowed).toBe(true));
        expect(result.current.isLoading).toBe(false);
    });

    it('is false for a tool the type lacks', async () => {
        apiGet.mockResolvedValue(ME);
        const { result } = renderHook(() => useHasVendorCapability('e1', 'ANNOUNCE'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.allowed).toBe(false);
    });

    it('is false once the access window has closed', async () => {
        apiGet.mockResolvedValue({ ...ME, accessOpen: false, capabilities: [], toolsOff: 'ACCESS_ENDED' });
        const { result } = renderHook(() => useHasVendorCapability('e1', 'SONG_REQUESTS'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.allowed).toBe(false);
    });

    it('is loading until the role arrives', () => {
        apiGet.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useHasVendorCapability('e1', 'SONG_REQUESTS'), { wrapper: wrapperFor(newClient()) });
        expect(result.current).toEqual({ allowed: false, isLoading: true });
    });
});

describe('useVendorLinks and useEventVendors', () => {
    it('loads the links only when enabled', async () => {
        apiGet.mockResolvedValue([{ vendorType: 'PHOTOGRAPHER', inviteToken: 't1' }]);
        const { result, rerender } = renderHook(({ enabled }) => useVendorLinks('e1', enabled), {
            wrapper: wrapperFor(newClient()),
            initialProps: { enabled: false },
        });
        expect(apiGet).not.toHaveBeenCalled();
        rerender({ enabled: true });
        await waitFor(() => expect(result.current.data).toHaveLength(1));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors/links');
    });

    it('loads the vendor list', async () => {
        apiGet.mockResolvedValue([]);
        const { result } = renderHook(() => useEventVendors('e1'), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual([]));
        expect(apiGet).toHaveBeenCalledWith('/api/events/e1/vendors');
    });
});

describe('mutations', () => {
    it('reset puts the new link in the cache and refreshes the links', async () => {
        apiPost.mockResolvedValue({ vendorType: 'MUSIC', inviteToken: 't2' });
        const client = newClient();
        client.setQueryData(vendorKeys.links('e1'), [
            { vendorType: 'MUSIC', inviteToken: 't1' },
            { vendorType: 'PLANNER', inviteToken: 'p1' },
        ]);
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useResetVendorLink('e1'), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync('MUSIC'));
        expect(apiPost).toHaveBeenCalledWith('/api/events/e1/vendors/links/MUSIC/reset');
        expect(client.getQueryData(vendorKeys.links('e1'))).toEqual([
            { vendorType: 'MUSIC', inviteToken: 't2' },
            { vendorType: 'PLANNER', inviteToken: 'p1' },
        ]);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.links('e1') });
    });

    it('patch refreshes the list and my role, sending one flag', async () => {
        apiPatch.mockResolvedValue({});
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const patch = renderHook(() => usePatchVendor('e1'), { wrapper: wrapperFor(client) });
        await act(() => patch.result.current.mutateAsync({ vendorId: 'v1', patch: { hiddenByHost: true } }));
        expect(apiPatch).toHaveBeenCalledWith('/api/events/e1/vendors/v1', { hiddenByHost: true });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('e1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.me('e1') });
    });

    it('remove refreshes the list, my role and the members', async () => {
        apiDel.mockResolvedValue(undefined);
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const remove = renderHook(() => useRemoveVendor('e1'), { wrapper: wrapperFor(client) });
        await act(() => remove.result.current.mutateAsync('v1'));
        expect(apiDel).toHaveBeenCalledWith('/api/events/e1/vendors/v1');
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('e1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.me('e1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'members'] });
    });

    it('a click is fire-and-forget', async () => {
        apiPost.mockRejectedValue(new ApiError(429, {}));
        const { result } = renderHook(() => useRecordVendorClick('e1'), { wrapper: wrapperFor(newClient()) });
        expect(() => result.current('v1')).not.toThrow();
        await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/api/events/e1/vendors/v1/clicks'));
    });
});
