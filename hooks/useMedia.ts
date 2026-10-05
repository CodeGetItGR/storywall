import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppConfig, usePresignedUrlRefreshMs } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { uploadInBatches } from '@/lib/api/batchUpload';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { MediaBatchUploadResponseDto, MediaResponseDto, MediaUploadContext, OriginalMediaUrlDto } from '@/lib/api/types';
import { sendUploadWithBusyRetry } from '@/lib/api/uploadRetry';
import { LIVE_CONTENT_STALE_TIME } from '@/lib/queryClient';
import { getUploadLimits } from '@/lib/uploadLimits';

export const mediaKeys = {
    list: (eventId: string) => ['events', eventId, 'media'] as const,
    detail: (id: string) => ['medias', id] as const,
};

export const MEDIA_PAGE_SIZE = 30;

// GET /api/events/{eventId}/media — any event member. Paginated, newest first.
// Refetched once per signing window so the presigned URLs it holds never expire.
export function useEventMedia(eventId: string | null) {
    const { isAuthenticated } = useAuth();
    const galleryReadable = useModuleReadable(eventId, 'gallery');
    const refetchInterval = usePresignedUrlRefreshMs();

    return useInfiniteQuery({
        queryKey: mediaKeys.list(eventId ?? ''),
        queryFn: ({ pageParam }) => api.get<Page<MediaResponseDto>>(`${endpoints.events.media(eventId!)}?page=${pageParam}&size=${MEDIA_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.page.number + 1 < lastPage.page.totalPages ? lastPage.page.number + 1 : undefined),
        enabled: Boolean(eventId) && isAuthenticated && galleryReadable,
        staleTime: LIVE_CONTENT_STALE_TIME,
        refetchInterval,
    });
}

// GET /api/medias/{id}. `mediaUrl` is a presigned R2 URL that expires
// (see lib/presignedUrls.ts) — re-fetch rather than caching it long-term.
export function useMediaItem(id: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: mediaKeys.detail(id ?? ''),
        queryFn: () => api.get<MediaResponseDto>(endpoints.medias.byId(id!)),
        enabled: Boolean(id) && isAuthenticated,
        staleTime: usePresignedUrlRefreshMs(),
    });
}

interface UploadMediaInput {
    eventId: string;
    file: File;
    context?: MediaUploadContext;
    // true while a busy server's advised wait runs before the upload is resent.
    onBusy?: (busy: boolean) => void;
}

// POST /api/events/{eventId}/media (multipart/form-data) — streams straight
// through this backend to R2, no separate presigned-upload-URL step. The
// uploader is always the caller's own membership, not a form field. Large
// uploads go through the app server, so plan progress/timeout UX around that.
// A busy server (503 + Retry-After) gets the upload resent after its wait.
export function useUploadMedia() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, file, context = 'GALLERY', onBusy }: UploadMediaInput) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('context', context);
            return sendUploadWithBusyRetry(() => api.postForm<MediaResponseDto>(endpoints.events.media(eventId), formData), { onBusy });
        },
        onSuccess: (media) => {
            queryClient.invalidateQueries({ queryKey: mediaKeys.list(media.eventId) });
        },
    });
}

interface UploadMediaBatchInput {
    eventId: string;
    files: File[];
    context?: MediaUploadContext;
    signal?: AbortSignal;
    // true while a busy server's advised wait runs before a request is resent.
    onBusy?: (busy: boolean) => void;
}

// POST /api/events/{eventId}/media/batch (multipart/form-data, repeated
// "files" field, with limits supplied by GET /api/config). Always resolves
// 200 — per-file
// outcomes are in the response body's `created`/`failed`, not the HTTP
// status, so check those rather than treating a 200 as "all succeeded".
// Files are split into as many requests as the request size and file-count
// limits need (see uploadInBatches); the outcome reads like one batch.
export function useUploadMediaBatch() {
    const queryClient = useQueryClient();
    const { data: appConfig } = useAppConfig();
    const limits = getUploadLimits(appConfig?.media);

    return useMutation({
        mutationFn: ({ eventId, files, context = 'GALLERY', signal, onBusy }: UploadMediaBatchInput) =>
            uploadInBatches(
                files,
                limits,
                (batch) => {
                    const formData = new FormData();
                    batch.forEach((file) => formData.append('files', file));
                    formData.append('context', context);
                    return api.postForm<MediaBatchUploadResponseDto>(endpoints.events.mediaBatch(eventId), formData, { signal });
                },
                { signal, onBusy },
            ),
        onSuccess: (result, { eventId }) => {
            if (result.created.length > 0) {
                queryClient.invalidateQueries({ queryKey: mediaKeys.list(eventId) });
            }
        },
    });
}

export async function pollMediaUntilProcessed(id: string, signal?: AbortSignal): Promise<MediaResponseDto> {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const media = await api.get<MediaResponseDto>(endpoints.medias.byId(id), { signal });

        if (media.status !== 'PROCESSING') return media;
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        signal?.throwIfAborted();
    }
    return await api.get<MediaResponseDto>(endpoints.medias.byId(id), { signal });
}

export function useOriginalMedia() {
    return useMutation({
        mutationFn: (id: string) => api.get<OriginalMediaUrlDto>(endpoints.medias.original(id)),
    });
}

// DELETE /api/medias/{id} — uploader or HOST. A 5004 STORAGE_UPLOAD_FAILED
// error means the R2 delete failed but the DB row may still exist.
export function useDeleteMedia(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.medias.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mediaKeys.list(eventId) });
        },
    });
}
