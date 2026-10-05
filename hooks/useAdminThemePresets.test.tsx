import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    adminThemePresetKeys,
    useAdminThemePresets,
    useCreateThemePreset,
    usePatchThemePreset,
    useUploadThemePresetIllustration,
} from '@/hooks/useAdminThemePresets';
import { endpoints } from '@/lib/api/endpoints';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), postForm: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const PRESET = { id: 'p1', key: 'dino-mint' };

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

let client: QueryClient;

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    for (const fn of Object.values(api)) {
        fn.mockReset();
        fn.mockResolvedValue(PRESET);
    }
});

describe('useAdminThemePresets', () => {
    it('lists the catalog', async () => {
        api.get.mockResolvedValue([PRESET]);
        const { result } = renderHook(() => useAdminThemePresets(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.data).toEqual([PRESET]));
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.themePresets.list);
    });
});

describe('admin theme preset mutations', () => {
    it('creates, then refreshes the list', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const input = { key: 'dino-mint', name: { en: 'Dino', el: 'Δ' }, backgroundColor: '#BFE6E2', eventTypes: ['BAPTISM' as const], sortOrder: 0 };
        const { result } = renderHook(() => useCreateThemePreset(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync(input));

        expect(api.post).toHaveBeenCalledWith(endpoints.admin.themePresets.list, input);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminThemePresetKeys.all });
    });

    it('patches one preset', async () => {
        const { result } = renderHook(() => usePatchThemePreset(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ id: 'p1', input: { archived: true } }));
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.themePresets.byId('p1'), { archived: true });
    });

    it('uploads the illustration as the multipart field "file"', async () => {
        const file = new File(['x'], 'dino.png', { type: 'image/png' });
        const { result } = renderHook(() => useUploadThemePresetIllustration(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ id: 'p1', file }));

        const [path, formData] = api.postForm.mock.calls[0] as [string, FormData];
        expect(path).toBe(endpoints.admin.themePresets.illustration('p1'));
        expect(formData.get('file')).toBe(file);
    });
});
