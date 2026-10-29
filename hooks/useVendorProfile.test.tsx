import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeleteVendorLogo, useSaveVendorProfile, useUploadVendorLogo, useVendorProfile, vendorProfileKeys } from '@/hooks/useVendorProfile';
import { vendorKeys } from '@/hooks/useVendors';
import { ApiError } from '@/lib/api/client';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiPost = vi.fn();
const apiPostForm = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        put: (...a: unknown[]) => apiPut(...a),
        post: (...a: unknown[]) => apiPost(...a),
        postForm: (...a: unknown[]) => apiPostForm(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));
const auth = vi.hoisted(() => ({ user: { role: 'USER' } as { role: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user) }) }));

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}
function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

const PROFILE = { businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x', logoUrl: null, partnerPromptDismissed: false };

beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
    apiPost.mockReset();
    apiPostForm.mockReset();
    apiDel.mockReset();
    auth.user = { role: 'USER' };
});

describe('useVendorProfile', () => {
    it('loads the profile', async () => {
        apiGet.mockResolvedValue(PROFILE);
        const { result } = renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.data).toEqual(PROFILE));
        expect(apiGet).toHaveBeenCalledWith('/api/me/vendor-profile');
    });

    it('reads 404 as no profile yet', async () => {
        apiGet.mockRejectedValue(new ApiError(404, {}));
        const { result } = renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('keeps other errors as errors', async () => {
        apiGet.mockRejectedValue(new ApiError(500, {}));
        const { result } = renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('does not ask for guest accounts', () => {
        auth.user = { role: 'GUEST' };
        renderHook(() => useVendorProfile(), { wrapper: wrapperFor(newClient()) });
        expect(apiGet).not.toHaveBeenCalled();
    });
});

describe('useSaveVendorProfile', () => {
    it('stores the saved profile and refreshes every event vendor key', async () => {
        apiPut.mockResolvedValue(PROFILE);
        const client = newClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useSaveVendorProfile(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x' }));
        expect(client.getQueryData(vendorProfileKeys.mine)).toEqual(PROFILE);
        expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
    });

    it('marks the vendor lists and the vendor role of every event stale, and nothing else', async () => {
        apiPut.mockResolvedValue(PROFILE);
        const client = newClient();
        client.setQueryData(vendorKeys.list('e1'), []);
        client.setQueryData(vendorKeys.me('e2'), {});
        client.setQueryData(['events', 'e1', 'posts'], []);
        const { result } = renderHook(() => useSaveVendorProfile(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ businessName: 'Studio X', vendorType: 'PHOTOGRAPHER', link: '@studio.x' }));
        expect(client.getQueryState(vendorKeys.list('e1'))?.isInvalidated).toBe(true);
        expect(client.getQueryState(vendorKeys.me('e2'))?.isInvalidated).toBe(true);
        expect(client.getQueryState(['events', 'e1', 'posts'])?.isInvalidated).toBe(false);
    });
});

describe('logo mutations', () => {
    it('uploads the file as multipart and stores the profile', async () => {
        apiPostForm.mockResolvedValue({ ...PROFILE, logoUrl: 'https://img/logo.png' });
        const client = newClient();
        const { result } = renderHook(() => useUploadVendorLogo(), { wrapper: wrapperFor(client) });
        const file = new File(['x'], 'logo.png', { type: 'image/png' });
        await act(() => result.current.mutateAsync(file));
        const [path, body] = apiPostForm.mock.calls[0];
        expect(path).toBe('/api/me/vendor-profile/logo');
        expect((body as FormData).get('file')).toBe(file);
        expect(client.getQueryData(vendorProfileKeys.mine)).toEqual({ ...PROFILE, logoUrl: 'https://img/logo.png' });
    });

    it('removes the logo and stores the profile', async () => {
        apiDel.mockResolvedValue(PROFILE);
        const client = newClient();
        const { result } = renderHook(() => useDeleteVendorLogo(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync());
        expect(apiDel).toHaveBeenCalledWith('/api/me/vendor-profile/logo');
        expect(client.getQueryData(vendorProfileKeys.mine)).toEqual(PROFILE);
    });
});
