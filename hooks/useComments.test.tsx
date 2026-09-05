import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { commentKeys, useCreateComment } from '@/hooks/useComments';
import { postKeys } from '@/hooks/usePosts';
import type { Page } from '@/lib/api/pagination';
import type { CommentResponseDto, PostResponseDto } from '@/lib/api/types';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: {
        get: (...a: unknown[]) => apiGet(...a),
        post: (...a: unknown[]) => apiPost(...a),
        del: vi.fn(),
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
        parentCommentId,
        content: `comment ${i}`,
        createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
        updatedAt: new Date(2026, 0, 1, 0, i).toISOString(),
        deletedAt: null,
    };
}

function post(overrides: Partial<PostResponseDto> = {}): PostResponseDto {
    return { id: POST_ID, eventId: EVENT_ID, commentCount: 30, ...overrides } as PostResponseDto;
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

        const commentsPage: Page<CommentResponseDto> = { content: [comment(0)], totalElements: 1, totalPages: 1, number: 0, size: 30 };
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
});
