import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClearDemoPersonaAvatar, useSetDemoPersonaAvatar } from '@/hooks/useDemoPersonaAvatar';
import { eventMemberKeys } from '@/hooks/useEventMembers';
import { storyKeys } from '@/hooks/useStories';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { postKeys } from '@/lib/postQueries';

const apiPostForm = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        postForm: (...a: unknown[]) => apiPostForm(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
}));

const EVENT_ID = 'event-1';

function member(id: string, avatarUrl: string | null): EventMemberResponseDto {
    return { id, eventId: EVENT_ID, displayName: id, avatarUrl } as EventMemberResponseDto;
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function expectPersonaViewsRefreshed(invalidate: ReturnType<typeof vi.spyOn>) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: eventMemberKeys.list(EVENT_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.list(EVENT_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: storyKeys.list(EVENT_ID) });
    // Post details and comment threads (commentKeys.list = ['posts', postId, 'comments']).
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['posts'] });
}

describe('useDemoPersonaAvatar', () => {
    let client: QueryClient;
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        apiPostForm.mockReset();
        apiDel.mockReset();
    });

    it('posts the file as multipart "file", swaps the member into the list and refreshes the feeds', async () => {
        client.setQueryData(eventMemberKeys.list(EVENT_ID), [member('m1', null), member('m2', null)]);
        apiPostForm.mockResolvedValue(member('m1', 'https://persona'));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useSetDemoPersonaAvatar(EVENT_ID), { wrapper: wrapperFor(client) });
        const file = new File([new Uint8Array([1])], 'p.jpg', { type: 'image/jpeg' });

        await act(() => result.current.mutateAsync({ memberId: 'm1', file }));

        const [path, form] = apiPostForm.mock.calls[0] as [string, FormData];
        expect(path).toBe('/api/event-members/m1/demo-avatar');
        expect(form.get('file')).toBe(file);
        expect(client.getQueryData<EventMemberResponseDto[]>(eventMemberKeys.list(EVENT_ID))?.map((m) => m.avatarUrl)).toEqual([
            'https://persona',
            null,
        ]);
        await waitFor(() => expectPersonaViewsRefreshed(invalidate));
    });

    it('clears with DELETE on the same path, swaps the member in and refreshes the same views', async () => {
        client.setQueryData(eventMemberKeys.list(EVENT_ID), [member('m1', 'https://old')]);
        apiDel.mockResolvedValue(member('m1', null));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useClearDemoPersonaAvatar(EVENT_ID), { wrapper: wrapperFor(client) });

        await act(() => result.current.mutateAsync('m1'));

        expect(apiDel).toHaveBeenCalledWith('/api/event-members/m1/demo-avatar');
        expect(client.getQueryData<EventMemberResponseDto[]>(eventMemberKeys.list(EVENT_ID))?.[0].avatarUrl).toBeNull();
        await waitFor(() => expectPersonaViewsRefreshed(invalidate));
    });

    it('does not touch the cache when the upload is refused', async () => {
        client.setQueryData(eventMemberKeys.list(EVENT_ID), [member('m1', null)]);
        apiPostForm.mockRejectedValue(new Error('5104'));
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useSetDemoPersonaAvatar(EVENT_ID), { wrapper: wrapperFor(client) });
        const file = new File([new Uint8Array([1])], 'p.jpg', { type: 'image/jpeg' });

        await act(async () => {
            await expect(result.current.mutateAsync({ memberId: 'm1', file })).rejects.toThrow('5104');
        });

        expect(invalidate).not.toHaveBeenCalled();
        expect(client.getQueryData<EventMemberResponseDto[]>(eventMemberKeys.list(EVENT_ID))?.[0].avatarUrl).toBeNull();
    });
});
