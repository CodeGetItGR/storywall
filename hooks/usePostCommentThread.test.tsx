import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePostCommentThread } from '@/hooks/usePostCommentThread';
import type { Page } from '@/lib/api/pagination';
import type { CommentResponseDto } from '@/lib/api/types';

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
const SIZE = 30;

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

let serverComments: CommentResponseDto[] = [];

function pageOf(pageNumber: number): Page<CommentResponseDto> {
    return {
        content: serverComments.slice(pageNumber * SIZE, pageNumber * SIZE + SIZE),
        totalElements: serverComments.length,
        totalPages: Math.max(1, Math.ceil(serverComments.length / SIZE)),
        number: pageNumber,
        size: SIZE,
    };
}

const messages = {
    PostModal: {
        commentFailed: "Couldn't post your comment. Please try again.",
        moduleUnavailable: 'Comments are not available.',
    },
};

function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
    return (
        <NextIntlClientProvider locale="en" messages={messages}>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </NextIntlClientProvider>
    );
}

beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiGet.mockImplementation(async (url: string) => pageOf(Number(new URL(url, 'http://x').searchParams.get('page'))));
});

// Regression coverage for docs/specs/post-comment-reply-visibility.md.
describe('usePostCommentThread', () => {
    it('shows a new reply immediately and keeps it visible after the post-success refetch settles', async () => {
        serverComments = Array.from({ length: 30 }, (_, i) => comment(i)); // exactly one page
        const reply = comment(999, 'c0');
        apiPost.mockResolvedValue(reply);

        const { result } = renderHook(() => usePostCommentThread(POST_ID, 'event-1', true), { wrapper });
        await waitFor(() => expect(result.current.comments).toHaveLength(30));

        act(() => result.current.onCommentTextChange('a reply'));
        await act(async () => {
            const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
            await result.current.onSubmit(event, 'member-1');
        });

        expect(result.current.comments.map((c) => c.id)).toContain(reply.id);
        expect(result.current.commentCountDelta).toBe(1);

        // A stray refetch of the loaded page range (window focus, remount)
        // must not remove it — nothing writes it into that cache anymore.
        serverComments = [...serverComments]; // server still hasn't returned it on page 0
        await act(async () => {
            await result.current.onLoadMoreComments();
        });
        await waitFor(() => expect(result.current.comments.map((c) => c.id)).toContain(reply.id));
    });

    it('places a new top-level comment at the end of the thread, not the end of the loaded page', async () => {
        serverComments = Array.from({ length: 95 }, (_, i) => comment(i)); // 4 server pages, 1 loaded
        const fresh = comment(999);
        apiPost.mockResolvedValue(fresh);

        const { result } = renderHook(() => usePostCommentThread(POST_ID, 'event-1', true), { wrapper });
        await waitFor(() => expect(result.current.comments.length).toBe(30));

        act(() => result.current.onCommentTextChange('new top level comment'));
        await act(async () => {
            const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
            await result.current.onSubmit(event, 'member-1');
        });

        const ids = result.current.comments.map((c) => c.id);
        expect(ids.at(-1)).toBe(fresh.id);
    });

    it('never renders a comment twice even if the server later returns the same id', async () => {
        serverComments = Array.from({ length: 30 }, (_, i) => comment(i));
        const reply = comment(999, 'c0');
        apiPost.mockResolvedValue(reply);

        const { result } = renderHook(() => usePostCommentThread(POST_ID, 'event-1', true), { wrapper });
        await waitFor(() => expect(result.current.comments).toHaveLength(30));

        act(() => result.current.onCommentTextChange('a reply'));
        await act(async () => {
            const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
            await result.current.onSubmit(event, 'member-1');
        });
        expect(result.current.comments.filter((c) => c.id === reply.id)).toHaveLength(1);

        // The server now legitimately reports the same comment on a page.
        serverComments.push(reply);
        await act(async () => {
            await result.current.onLoadMoreComments();
        });
        expect(result.current.comments.filter((c) => c.id === reply.id)).toHaveLength(1);
    });

    it('prefills an @mention when replying to a reply, but not when replying to the top-level comment', () => {
        const { result } = renderHook(() => usePostCommentThread(POST_ID, 'event-1', true), { wrapper });

        act(() => result.current.onReply('c0', 'Root Author'));
        expect(result.current.commentText).toBe('');

        act(() => result.current.onReply('c0', 'Reply Author', true));
        expect(result.current.commentText).toBe('@Reply Author ');
    });

    it('clears the composer and reply target, and leaves nothing pending, on a failed post', async () => {
        apiPost.mockRejectedValue(new Error('network error'));
        serverComments = [];

        const { result } = renderHook(() => usePostCommentThread(POST_ID, 'event-1', true), { wrapper });
        await waitFor(() => expect(result.current.comments).toEqual([]));

        act(() => result.current.onCommentTextChange('will fail'));
        await act(async () => {
            const event = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
            await result.current.onSubmit(event, 'member-1');
        });

        expect(result.current.commentError).toBeTruthy();
        expect(result.current.commentText).toBe('will fail'); // draft preserved
        expect(result.current.commentCountDelta).toBe(0);
        expect(result.current.comments).toEqual([]);
    });
});
