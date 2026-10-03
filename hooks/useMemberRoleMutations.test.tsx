import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventMemberKeys } from '@/hooks/useEventMembers';
import { useClearMemberRole, useSetMemberRole } from '@/hooks/useMemberRoleMutations';
import { memberRoleOptionKeys } from '@/hooks/useMemberRoleOptions';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { storyKeys } from '@/hooks/useStories';
import { postKeys } from '@/lib/postQueries';

const apiPut = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { put: (...a: unknown[]) => apiPut(...a), del: (...a: unknown[]) => apiDel(...a), get: vi.fn() },
    ApiError: class ApiError extends Error {
        status: number;
        problem: unknown;
        constructor(status: number, body: unknown) {
            super('api');
            this.status = status;
            this.problem = body;
        }
    },
}));

const EVENT_ID = 'event-1';
const author = (memberId: string) => ({ memberId, displayName: 'A', nickname: null, role: 'MEMBER', avatarUrl: null, roleKey: null, customRole: null });
const member = (id: string) => ({ id, eventId: EVENT_ID, relationshipRole: null, customRelationshipRole: null });

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(postKeys.list(EVENT_ID), { pages: [{ content: [{ id: 'p1', author: author('m1') }] }], pageParams: [0] });
    client.setQueryData(postKeys.detail('p1'), { id: 'p1', author: author('m1') });
    client.setQueryData(['posts', 'p1', 'comments'], { pages: [{ content: [{ id: 'c1', author: author('m1') }] }], pageParams: [0] });
    client.setQueryData(storyKeys.list(EVENT_ID), [{ id: 's1', author: author('m1') }]);
    client.setQueryData(eventMemberKeys.list(EVENT_ID), [member('m1'), member('m2')]);
    client.setQueryData(myEventsKeys.all, [member('m1')]);
    client.setQueryData(memberRoleOptionKeys.list(EVENT_ID), { allowCustom: true, customLocked: false, roles: [] });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { client, wrapper };
}

beforeEach(() => {
    apiPut.mockReset();
    apiDel.mockReset();
});

describe('useSetMemberRole', () => {
    it('patches every cached copy of the member after a 204', async () => {
        apiPut.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useSetMemberRole(EVENT_ID), { wrapper });

        await act(() => result.current.mutateAsync({ memberId: 'm1', request: { roleKey: 'BRIDE' } }));

        expect(apiPut).toHaveBeenCalledWith('/api/event-members/m1/role', { roleKey: 'BRIDE' });
        const feed = client.getQueryData<{ pages: { content: { author: { roleKey: string } }[] }[] }>(postKeys.list(EVENT_ID));
        expect(feed?.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(client.getQueryData<{ author: { roleKey: string } }>(postKeys.detail('p1'))?.author.roleKey).toBe('BRIDE');
        const comments = client.getQueryData<{ pages: { content: { author: { roleKey: string } }[] }[] }>(['posts', 'p1', 'comments']);
        expect(comments?.pages[0].content[0].author.roleKey).toBe('BRIDE');
        expect(client.getQueryData<{ author: { roleKey: string } }[]>(storyKeys.list(EVENT_ID))?.[0].author.roleKey).toBe('BRIDE');
        const members = client.getQueryData<{ relationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID));
        expect(members?.[0].relationshipRole).toBe('BRIDE');
        expect(members?.[1].relationshipRole).toBeNull();
        expect(client.getQueryData<{ relationshipRole: string }[]>(myEventsKeys.all)?.[0].relationshipRole).toBe('BRIDE');
        expect(client.getQueryState(memberRoleOptionKeys.list(EVENT_ID))?.isInvalidated).toBe(true);
    });

    it('refetches the options when the role is full', async () => {
        const { ApiError } = await import('@/lib/api/client');
        apiPut.mockRejectedValue(new ApiError(409, { errorCode: 5114 }));
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useSetMemberRole(EVENT_ID), { wrapper });

        await act(async () => {
            await result.current.mutateAsync({ memberId: 'm1', request: { roleKey: 'BEST_MAN' } }).catch(() => undefined);
        });

        await waitFor(() => expect(client.getQueryState(memberRoleOptionKeys.list(EVENT_ID))?.isInvalidated).toBe(true));
        expect(client.getQueryData<{ relationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID))?.[0].relationshipRole).toBeNull();
    });
});

describe('useClearMemberRole', () => {
    it('clears the role in the caches', async () => {
        apiDel.mockResolvedValue(undefined);
        const { client, wrapper } = setup();
        client.setQueryData(eventMemberKeys.list(EVENT_ID), [{ ...member('m1'), customRelationshipRole: 'Uncle' }]);
        const { result } = renderHook(() => useClearMemberRole(EVENT_ID), { wrapper });

        await act(() => result.current.mutateAsync('m1'));

        expect(apiDel).toHaveBeenCalledWith('/api/event-members/m1/role');
        expect(client.getQueryData<{ customRelationshipRole: string | null }[]>(eventMemberKeys.list(EVENT_ID))?.[0].customRelationshipRole).toBeNull();
    });
});
