import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingImage } from '@/hooks/useComposerController';
import { usePublishQueueController } from '@/hooks/usePublishQueueController';
import type { PendingStory } from '@/hooks/useStoryComposerController';

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
            expect.objectContaining({ eventId: 'event-1', mediaIds: ['media-1'] })
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
        expect(apiPost).toHaveBeenCalledWith(expect.stringContaining('stories'), expect.any(Array));
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
});
