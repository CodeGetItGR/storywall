import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventMemberKeys, useDeleteEventMember, useUpdateEventMember } from '@/hooks/useEventMembers';

const apiPatch = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        patch: (...a: unknown[]) => apiPatch(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

const EVENT_ID = 'event-1';
const MEMBER_ID = 'member-1';

beforeEach(() => {
    apiPatch.mockReset();
    apiDel.mockReset();
});

describe('useUpdateEventMember', () => {
    it('invalidates the RSVP list so the report refreshes too', async () => {
        apiPatch.mockResolvedValue({ id: MEMBER_ID, eventId: EVENT_ID });
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useUpdateEventMember(MEMBER_ID, EVENT_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await result.current.mutateAsync({ displayName: 'New name' });
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventMemberKeys.list(EVENT_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events', EVENT_ID, 'rsvps'] });
    });
});

describe('useDeleteEventMember', () => {
    it('invalidates the RSVP list so the report refreshes too', async () => {
        apiDel.mockResolvedValue(undefined);
        const client = newClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteEventMember(EVENT_ID), { wrapper: wrapperFor(client) });

        await act(async () => {
            await result.current.mutateAsync(MEMBER_ID);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: eventMemberKeys.list(EVENT_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events', EVENT_ID, 'rsvps'] });
    });
});
