import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { commentKeys, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { postKeys } from '@/hooks/usePosts';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { CommentResponseDto, PostResponseDto } from '@/lib/api/types';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDel = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        del: (...a: unknown[]) => apiDel(...a),
    },
    ApiError: class ApiError extends Error {},
}));

const POST_ID = 'post-1';
const EVENT_ID = 'event-1';

function comment(i: number, parentCommentId: string | null = null): CommentResponseDto {
    return {
        id: `c${i}`,
        postId: POST_ID,
        authorMemberId: 'm1',
        author: null,
        parentCommentId,
        content: `comment ${i}`,
        createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
        updatedAt: new Date(2026, 0, 1, 0, i).toISOString(),
        deletedAt: null,
    };
}

function post(overrides: Partial<PostResponseDto> = {}): PostResponseDto {
    return { id: POST_ID, eventId: EVENT_ID, commentCount: 30, recentComments: [], ...overrides } as PostResponseDto;
}

// The feed's cached first page, holding the post and one other.
function seedFeed(client: QueryClient, feedPost: PostResponseDto) {
    const other = post({ id: 'post-2', commentCount: 0 });
    const page: Page<PostResponseDto> = { content: [feedPost, other], page: { size: 20, number: 0, totalElements: 2, totalPages: 1 } };
    client.setQueryData(postKeys.list(EVENT_ID), { pages: [page], pageParams: [0] });
}

function feedPost(client: QueryClient, id = POST_ID) {
    return client
        .getQueryData<{ pages: Page<PostResponseDto>[] }>(postKeys.list(EVENT_ID))
        ?.pages.flatMap((page) => page.content)
        .find((item) => item.id === id);
}

function invalidatedKeysOf(spy: { mock: { calls: unknown[][] } }) {
    return spy.mock.calls.map((call) => JSON.stringify((call[0] as { queryKey?: unknown } | undefined)?.queryKey));
}

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function newClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
}

beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiDel.mockReset();
});

// Regression coverage for docs/specs/post-comment-reply-visibility.md.
// The root cause was a React Query key-prefix collision: invalidating
// postKeys.detail(id) (['posts', id]) also matched commentKeys.list(id)
// (['posts', id, 'comments']), silently wiping a just-appended comment.
describe('useCreateComment', () => {
    it('does not invalidate the comments list when it refreshes the post', async () => {
        const client = newClient();
        const wrapper = wrapperFor(client);
        const cachedPost = post({ commentCount: 30 });
        client.setQueryData(postKeys.detail(POST_ID), cachedPost);

        const commentsPage: Page<CommentResponseDto> = { content: [comment(0)], page: { size: 30, number: 0, totalElements: 1, totalPages: 1 } };
        client.setQueryData(commentKeys.list(POST_ID), { pages: [commentsPage], pageParams: [0] });

        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const created = renderHook(() => useCreateComment(EVENT_ID), { wrapper });
        const reply = comment(999, 'c0');
        apiPost.mockResolvedValue(reply);

        await act(async () => {
            await created.result.current.mutateAsync({ postId: POST_ID, content: 'reply', parentCommentId: 'c0' });
        });

        const invalidatedKeys = invalidateSpy.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
        expect(invalidatedKeys).not.toContainEqual(JSON.stringify(commentKeys.list(POST_ID)));

        // The comment list cache is untouched by the mutation — it's the
        // caller's job (usePostCommentThread) to merge in the new comment.
        expect(client.getQueryData(commentKeys.list(POST_ID))).toEqual({ pages: [commentsPage], pageParams: [0] });
    });

    it('bumps the cached post.commentCount immediately, without waiting on a refetch', async () => {
        const client = newClient();
        const wrapper = wrapperFor(client);
        client.setQueryData(postKeys.detail(POST_ID), post({ commentCount: 5 }));

        const created = renderHook(() => useCreateComment(EVENT_ID), { wrapper });
        apiPost.mockResolvedValue(comment(999));

        await act(async () => {
            await created.result.current.mutateAsync({ postId: POST_ID, content: 'hi' });
        });

        expect(client.getQueryData<PostResponseDto>(postKeys.detail(POST_ID))?.commentCount).toBe(6);
    });

    it("adds the comment to the post's feed preview without refetching the feed", async () => {
        const client = newClient();
        const wrapper = wrapperFor(client);
        const open = post({ commentCount: 2, recentComments: [comment(1), comment(2)] });
        client.setQueryData(postKeys.detail(POST_ID), open);
        seedFeed(client, open);
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const created = renderHook(() => useCreateComment(EVENT_ID), { wrapper });
        apiPost.mockResolvedValue(comment(3));

        await act(async () => {
            await created.result.current.mutateAsync({ postId: POST_ID, content: 'hi' });
        });

        // The preview keeps the latest two, oldest-first.
        expect(feedPost(client)?.commentCount).toBe(3);
        expect(feedPost(client)?.recentComments.map((item) => item.id)).toEqual(['c2', 'c3']);
        expect(client.getQueryData<PostResponseDto>(postKeys.detail(POST_ID))?.recentComments.map((item) => item.id)).toEqual(['c2', 'c3']);
        expect(feedPost(client, 'post-2')?.commentCount).toBe(0);
        expect(invalidatedKeysOf(invalidateSpy)).not.toContainEqual(JSON.stringify(postKeys.list(EVENT_ID)));
        expect(apiGet).not.toHaveBeenCalled();
    });

    it('patches the feed copy when the post is not open', async () => {
        const client = newClient();
        const wrapper = wrapperFor(client);
        seedFeed(client, post({ commentCount: 0 }));

        const created = renderHook(() => useCreateComment(EVENT_ID), { wrapper });
        apiPost.mockResolvedValue(comment(1));

        await act(async () => {
            await created.result.current.mutateAsync({ postId: POST_ID, content: 'hi' });
        });

        expect(feedPost(client)?.commentCount).toBe(1);
        expect(feedPost(client)?.recentComments.map((item) => item.id)).toEqual(['c1']);
    });
});

describe('useDeleteComment', () => {
    it('drops the comment at once, then refetches only that post', async () => {
        const client = newClient();
        const wrapper = wrapperFor(client);
        const open = post({ commentCount: 3, recentComments: [comment(2), comment(3)] });
        client.setQueryData(postKeys.detail(POST_ID), open);
        seedFeed(client, open);
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        // The server's copy after the delete: the older comment moves into the preview.
        let resolveRefetch: (value: PostResponseDto) => void = () => {};
        apiGet.mockReturnValue(new Promise<PostResponseDto>((resolve) => (resolveRefetch = resolve)));
        apiDel.mockResolvedValue(undefined);

        const deleted = renderHook(() => useDeleteComment(EVENT_ID, POST_ID), { wrapper });
        await act(async () => {
            await deleted.result.current.mutateAsync('c3');
        });

        expect(feedPost(client)?.commentCount).toBe(2);
        expect(feedPost(client)?.recentComments.map((item) => item.id)).toEqual(['c2']);

        await act(async () => {
            resolveRefetch(post({ commentCount: 2, recentComments: [comment(1), comment(2)] }));
        });

        expect(apiGet).toHaveBeenCalledTimes(1);
        expect(apiGet).toHaveBeenCalledWith(endpoints.posts.byId(POST_ID));
        expect(feedPost(client)?.recentComments.map((item) => item.id)).toEqual(['c1', 'c2']);
        expect(client.getQueryData<PostResponseDto>(postKeys.detail(POST_ID))?.recentComments.map((item) => item.id)).toEqual(['c1', 'c2']);

        const invalidatedKeys = invalidatedKeysOf(invalidateSpy);
        expect(invalidatedKeys).toContainEqual(JSON.stringify(commentKeys.list(POST_ID)));
        expect(invalidatedKeys).not.toContainEqual(JSON.stringify(postKeys.list(EVENT_ID)));
    });
});
