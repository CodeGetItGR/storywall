import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminThemeFontKeys, useAdminThemeFonts, useCreateThemeFont, usePatchThemeFont, useUploadThemeFontFile } from '@/hooks/useAdminThemeFonts';
import { adminThemePresetKeys } from '@/hooks/useAdminThemePresets';
import { endpoints } from '@/lib/api/endpoints';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), postForm: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

const FONT = { id: 'f1', key: 'gfs-didot' };

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
        fn.mockResolvedValue(FONT);
    }
});

describe('useAdminThemeFonts', () => {
    it('lists the catalog', async () => {
        api.get.mockResolvedValue([FONT]);
        const { result } = renderHook(() => useAdminThemeFonts(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current.data).toEqual([FONT]));
        expect(api.get).toHaveBeenCalledWith(endpoints.admin.themeFonts.list);
    });
});

describe('admin theme font mutations', () => {
    it('creates, then refreshes the fonts and the presets', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const input = { key: 'gfs-didot', familyName: 'GFS Didot', fallback: 'serif' as const };
        const { result } = renderHook(() => useCreateThemeFont(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync(input));

        expect(api.post).toHaveBeenCalledWith(endpoints.admin.themeFonts.list, input);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminThemeFontKeys.all });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminThemePresetKeys.all });
    });

    it('patches one font', async () => {
        const { result } = renderHook(() => usePatchThemeFont(), { wrapper: wrapperFor(client) });
        await act(() => result.current.mutateAsync({ id: 'f1', input: { archived: true } }));
        expect(api.patch).toHaveBeenCalledWith(endpoints.admin.themeFonts.byId('f1'), { archived: true });
    });

    it('uploads the file as multipart field "file"', async () => {
        const file = new File(['x'], 'didot.woff2');
        const { result } = renderHook(() => useUploadThemeFontFile(), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync({ id: 'f1', file }));

        const [path, body] = api.postForm.mock.calls[0] as [string, FormData];
        expect(path).toBe(endpoints.admin.themeFonts.file('f1'));
        expect(body.get('file')).toBe(file);
    });
});
