import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingImage } from '@/hooks/useComposerController';
import { usePublishQueueController } from '@/hooks/usePublishQueueController';
import type { PendingStory } from '@/hooks/useStoryComposerController';
import type { AuthSessionDto } from '@/lib/api/types';
import { clearSession, setSession } from '@/lib/auth/tokenStore';

const apiPost = vi.fn();
const apiPostForm = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: {
        post: (...a: unknown[]) => apiPost(...a),
        postForm: (...a: unknown[]) => apiPostForm(...a),
    },
    ApiError: class ApiError extends Error {},
}));

vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

function makeImage(overrides: Partial<PendingImage> = {}): PendingImage {
    return {
        key: 'img-1',
        file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:photo',
        status: 'pending',
        filterId: 'original',
        ...overrides,
    };
}

function wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return (
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={{}}>
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    apiPost.mockReset();
    apiPostForm.mockReset();
});

describe('usePublishQueueController — post jobs', () => {
    it('uploads images, creates the post, and marks the job successful', async () => {
        apiPostForm.mockResolvedValue({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: 'Hello',
                images: [makeImage()],
            });
        });

        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].status).toBe('pending');

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));

        expect(apiPostForm).toHaveBeenCalledTimes(1);
        expect(apiPost).toHaveBeenCalledWith(
            expect.stringContaining('posts'),
            expect.objectContaining({ eventId: 'event-1', mediaIds: ['media-1'] }),
            { signal: expect.any(AbortSignal) },
        );
    });

    it('marks the job as error when the upload fails', async () => {
        apiPostForm.mockRejectedValue(new Error('network down'));

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: '',
                images: [makeImage()],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        expect(apiPost).not.toHaveBeenCalled();
    });

    it('retry re-runs the failed job without re-uploading already-uploaded images', async () => {
        apiPostForm.mockResolvedValueOnce({
            created: [],
            failed: [{ filename: 'photo.jpg', errorCode: 'STORAGE_UPLOAD_FAILED', message: 'nope' }],
        });
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueuePost({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                caption: 'Hello',
                images: [makeImage()],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));

        apiPostForm.mockResolvedValueOnce({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });

        act(() => {
            result.current.retryJob(result.current.jobs[0].id);
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPostForm).toHaveBeenCalledTimes(2);
    });
});

function makeStoryItem(overrides: Partial<PendingStory> = {}): PendingStory {
    return {
        key: 'story-1',
        file: new File(['x'], 'clip.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:clip',
        caption: '',
        filterId: 'original',
        status: 'ready',
        ...overrides,
    };
}

describe('usePublishQueueController — story jobs', () => {
    it('uploads items and creates all stories', async () => {
        apiPostForm.mockResolvedValue({
            created: [{ id: 'media-1', originalFilename: 'clip.jpg', mediaUrl: 'https://x/clip.jpg', status: 'READY' }],
            failed: [],
        });
        apiPost.mockResolvedValue({
            created: [{ id: 'story-1', eventId: 'event-1', mediaId: 'media-1' }],
            failed: [],
        });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueStory({ eventId: 'event-1', authorMemberId: 'member-1', items: [makeStoryItem()] });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPostForm).toHaveBeenCalledTimes(1);
        expect(apiPost).toHaveBeenCalledWith(expect.stringContaining('stories'), expect.any(Array), { signal: expect.any(AbortSignal) });
    });

    it('keeps the job in error state with only the failed items on partial failure', async () => {
        apiPostForm.mockResolvedValue({
            created: [
                { id: 'media-1', originalFilename: 'clip.jpg', mediaUrl: 'https://x/clip.jpg', status: 'READY' },
                { id: 'media-2', originalFilename: 'clip2.jpg', mediaUrl: 'https://x/clip2.jpg', status: 'READY' },
            ],
            failed: [],
        });
        apiPost.mockResolvedValue({
            created: [{ id: 'story-1', eventId: 'event-1', mediaId: 'media-1' }],
            failed: [{ mediaId: 'media-2', message: 'nope' }],
        });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueStory({
                eventId: 'event-1',
                authorMemberId: 'member-1',
                items: [
                    makeStoryItem({ key: 'story-1', file: new File(['x'], 'clip.jpg', { type: 'image/jpeg' }) }),
                    makeStoryItem({ key: 'story-2', file: new File(['x'], 'clip2.jpg', { type: 'image/jpeg' }) }),
                ],
            });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        const job = result.current.jobs[0];
        if (job.kind !== 'story') throw new Error('expected story job');
        expect(job.postedCount).toBe(1);
        expect(job.totalCount).toBe(2);
        expect(job.payload.items).toHaveLength(1);
        expect(job.payload.items[0].key).toBe('story-2');
    });

    it('says why when the story limit stopped an item', async () => {
        apiPostForm.mockResolvedValue({
            created: [{ id: 'media-1', originalFilename: 'clip.jpg', mediaUrl: 'https://x/clip.jpg', status: 'READY' }],
            failed: [],
        });
        apiPost.mockResolvedValue({
            created: [],
            failed: [{ mediaId: 'media-1', errorCode: 'STORY_LIVE_LIMIT_REACHED', message: 'limit' }],
        });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueStory({ eventId: 'event-1', authorMemberId: 'member-1', items: [makeStoryItem()] });
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        const job = result.current.jobs[0];
        if (job.kind !== 'story') throw new Error('expected story job');
        expect(job.failureReason).toContain('liveLimitReached');
        expect(job.payload.items[0].error).toContain('liveLimitReached');

        // A retry starts without the old reason.
        act(() => result.current.retryJob(job.id));
        expect(result.current.jobs[0].failureReason).toBeUndefined();
    });
});

describe('usePublishQueueController — song jobs', () => {
    const song = { eventId: 'event-1', title: 'Dancing Queen', artist: 'ABBA' };

    it('creates the suggestion and marks the job successful', async () => {
        apiPost.mockResolvedValue({ id: 'suggestion-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueSong(song);
        });

        expect(result.current.jobs[0]).toMatchObject({ kind: 'song', status: 'pending' });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPost).toHaveBeenCalledWith(expect.stringContaining('playlist-suggestions'), song, { signal: expect.any(AbortSignal) });
    });

    it('marks the job as error on failure and succeeds on retry', async () => {
        apiPost.mockRejectedValueOnce(new Error('network down'));

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });

        act(() => {
            result.current.enqueueSong(song);
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('error'));
        expect(result.current.jobs[0].error).toBeTruthy();

        apiPost.mockResolvedValueOnce({ id: 'suggestion-1', eventId: 'event-1' });
        act(() => {
            result.current.retryJob(result.current.jobs[0].id);
        });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPost).toHaveBeenCalledTimes(2);
    });
});

function sessionFor(userId: string, accessToken: string): AuthSessionDto {
    return {
        accessToken,
        userId,
        email: `${userId}@example.com`,
        role: 'USER',
        firstName: userId,
        lastName: null,
        profilePictureUrl: null,
        authProvider: 'LOCAL',
        isGuestAccount: false,
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00Z',
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

// A job belongs to the account that started it. Its later requests read the
// global access token, so once the account changes they would run as the new
// user: A's post, published under B.
describe('usePublishQueueController — account changes', () => {
    beforeEach(() => setSession(sessionFor('user-a', 'token-a')));
    afterEach(() => clearSession());

    function enqueueTextAndImagePost(result: { current: ReturnType<typeof usePublishQueueController> }) {
        act(() => {
            result.current.enqueuePost({ eventId: 'event-1', authorMemberId: 'member-a', caption: 'From A', images: [makeImage()] });
        });
    }

    it('never sends the post request once another user has signed in between upload and post creation', async () => {
        const upload = deferred<unknown>();
        apiPostForm.mockReturnValue(upload.promise);
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });
        enqueueTextAndImagePost(result);
        await waitFor(() => expect(apiPostForm).toHaveBeenCalledTimes(1));
        const uploadSignal = (apiPostForm.mock.calls[0][2] as RequestInit).signal;

        act(() => {
            clearSession();
            setSession(sessionFor('user-b', 'token-b'));
        });
        expect(uploadSignal?.aborted).toBe(true);

        await act(async () => {
            upload.resolve({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });
            await upload.promise;
        });

        expect(apiPost).not.toHaveBeenCalled();
        // Nothing for user B to see: the job was abandoned, not failed.
        expect(result.current.jobs[0].status).toBe('pending');
        expect(result.current.jobs[0].error).toBeUndefined();
    });

    it('never sends the post request after the controller unmounts', async () => {
        const upload = deferred<unknown>();
        apiPostForm.mockReturnValue(upload.promise);

        const { result, unmount } = renderHook(() => usePublishQueueController(), { wrapper });
        enqueueTextAndImagePost(result);
        await waitFor(() => expect(apiPostForm).toHaveBeenCalledTimes(1));

        unmount();
        expect((apiPostForm.mock.calls[0][2] as RequestInit).signal?.aborted).toBe(true);

        await act(async () => {
            upload.resolve({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });
            await upload.promise;
        });

        expect(apiPost).not.toHaveBeenCalled();
    });

    it('does not surface the aborted upload as an error', async () => {
        apiPostForm.mockImplementation(
            (_path: string, _form: FormData, options: RequestInit) =>
                new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
        );

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });
        enqueueTextAndImagePost(result);
        await waitFor(() => expect(apiPostForm).toHaveBeenCalledTimes(1));

        await act(async () => {
            clearSession();
            await Promise.resolve();
        });

        expect(result.current.jobs[0].status).toBe('pending');
        expect(result.current.jobs[0].error).toBeUndefined();
        expect(apiPost).not.toHaveBeenCalled();
    });

    it('keeps going through a token refresh for the same user', async () => {
        const upload = deferred<unknown>();
        apiPostForm.mockReturnValue(upload.promise);
        apiPost.mockResolvedValue({ id: 'post-1', eventId: 'event-1' });

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });
        enqueueTextAndImagePost(result);
        await waitFor(() => expect(apiPostForm).toHaveBeenCalledTimes(1));

        act(() => setSession(sessionFor('user-a', 'token-a-refreshed')));
        upload.resolve({ created: [{ id: 'media-1', originalFilename: 'photo.jpg' }], failed: [] });

        await waitFor(() => expect(result.current.jobs[0].status).toBe('success'));
        expect(apiPost).toHaveBeenCalledTimes(1);
    });

    it('never creates stories once another user has signed in after the upload', async () => {
        const upload = deferred<unknown>();
        apiPostForm.mockReturnValue(upload.promise);

        const { result } = renderHook(() => usePublishQueueController(), { wrapper });
        act(() => {
            result.current.enqueueStory({ eventId: 'event-1', authorMemberId: 'member-a', items: [makeStoryItem()] });
        });
        await waitFor(() => expect(apiPostForm).toHaveBeenCalledTimes(1));

        act(() => setSession(sessionFor('user-b', 'token-b')));
        await act(async () => {
            upload.resolve({ created: [{ id: 'media-1', originalFilename: 'clip.jpg', status: 'READY' }], failed: [] });
            await upload.promise;
        });

        expect(apiPost).not.toHaveBeenCalled();
        expect(result.current.jobs[0].error).toBeUndefined();
    });
});
