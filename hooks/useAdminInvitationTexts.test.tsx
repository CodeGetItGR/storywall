import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminFontPairingKeys, useAdminFontPairings, useCreateFontPairing, usePatchFontPairing } from '@/hooks/useAdminFontPairings';
import {
    adminInvitationTextKeys,
    useAdminInvitationTexts,
    useCreateInvitationText,
    useDeleteInvitationText,
    usePatchInvitationText,
} from '@/hooks/useAdminInvitationTexts';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api,
}));

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    for (const fn of Object.values(api)) {
        fn.mockReset();
        fn.mockResolvedValue({ id: 'x1' });
    }
});

describe('invitation text queries', () => {
    it('lists the texts', async () => {
        api.get.mockResolvedValue([{ id: 't1' }]);
        const { result } = renderHook(() => useAdminInvitationTexts(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual([{ id: 't1' }]));
        expect(api.get).toHaveBeenCalledWith('/api/admin/invitation-texts');
    });

    it('creates, changes and deletes one text, then refetches the list', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const create = renderHook(() => useCreateInvitationText(), { wrapper }).result;
        const patch = renderHook(() => usePatchInvitationText(), { wrapper }).result;
        const remove = renderHook(() => useDeleteInvitationText(), { wrapper }).result;

        await act(() => create.current.mutateAsync({ eventType: 'WEDDING', language: 'el', label: 'A', body: 'B' }));
        await act(() => patch.current.mutateAsync({ id: 't1', input: { label: 'C' } }));
        await act(() => remove.current.mutateAsync('t1'));

        expect(api.post).toHaveBeenCalledWith('/api/admin/invitation-texts', { eventType: 'WEDDING', language: 'el', label: 'A', body: 'B' });
        expect(api.patch).toHaveBeenCalledWith('/api/admin/invitation-texts/t1', { label: 'C' });
        expect(api.del).toHaveBeenCalledWith('/api/admin/invitation-texts/t1');
        expect(invalidate).toHaveBeenCalledTimes(3);
        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminInvitationTextKeys.all });
    });
});

describe('font pairing queries', () => {
    it('lists the pairings', async () => {
        api.get.mockResolvedValue([{ id: 'p1' }]);
        const { result } = renderHook(() => useAdminFontPairings(), { wrapper });
        await waitFor(() => expect(result.current.data).toEqual([{ id: 'p1' }]));
        expect(api.get).toHaveBeenCalledWith('/api/admin/invitation-typography-presets');
    });

    it('creates and changes one pairing, then refetches the list', async () => {
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const create = renderHook(() => useCreateFontPairing(), { wrapper }).result;
        const patch = renderHook(() => usePatchFontPairing(), { wrapper }).result;

        await act(() => create.current.mutateAsync({ name: 'Classic' }));
        await act(() => patch.current.mutateAsync({ id: 'p1', input: { hidden: true } }));

        expect(api.post).toHaveBeenCalledWith('/api/admin/invitation-typography-presets', { name: 'Classic' });
        expect(api.patch).toHaveBeenCalledWith('/api/admin/invitation-typography-presets/p1', { hidden: true });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: adminFontPairingKeys.all });
    });
});
