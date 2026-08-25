import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { MediaBatchUploadResponseDto, MediaResponseDto, OriginalMediaUrlDto } from '@/lib/api/types';

export const mediaKeys = {
    list: (eventId: string) => ['events', eventId, 'media'] as const,
    detail: (id: string) => ['medias', id] as const,
};

const MEDIA_PAGE_SIZE = 30;

// GET /api/events/{eventId}/media — any event member. Paginated, newest first.
export function useEventMedia(eventId: string | null) {
    return useInfiniteQuery({
        queryKey: mediaKeys.list(eventId ?? ''),
        queryFn: ({ pageParam }) => api.get<Page<MediaResponseDto>>(`${endpoints.events.media(eventId!)}?page=${pageParam}&size=${MEDIA_PAGE_SIZE}`),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined),
        enabled: Boolean(eventId),
    });
}

// GET /api/medias/{id}. `mediaUrl` is a presigned R2 URL that expires
// (~15min default) — re-fetch rather than caching it long-term.
export function useMediaItem(id: string | null) {
    return useQuery({
        queryKey: mediaKeys.detail(id ?? ''),
        queryFn: () => api.get<MediaResponseDto>(endpoints.medias.byId(id!)),
        enabled: Boolean(id),
    });
}

interface UploadMediaInput {
    eventId: string;
    file: File;
    uploaderMemberId?: string;
}

// POST /api/events/{eventId}/media (multipart/form-data) — streams straight
// through this backend to R2, no separate presigned-upload-URL step. Large
// uploads go through the app server, so plan progress/timeout UX around that.
export function useUploadMedia() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, file, uploaderMemberId }: UploadMediaInput) => {
            const formData = new FormData();
            formData.append('file', file);
            if (uploaderMemberId) formData.append('uploaderMemberId', uploaderMemberId);
            return api.postForm<MediaResponseDto>(endpoints.events.media(eventId), formData);
        },
        onSuccess: (media) => {
            queryClient.invalidateQueries({ queryKey: mediaKeys.list(media.eventId) });
        },
    });
}

interface UploadMediaBatchInput {
    eventId: string;
    files: File[];
    uploaderMemberId?: string;
}

// POST /api/events/{eventId}/media/batch (multipart/form-data, repeated
// "files" field, 1..10 files, 20MB/file). Always resolves 200 — per-file
// outcomes are in the response body's `created`/`failed`, not the HTTP
// status, so check those rather than treating a 200 as "all succeeded".
export function useUploadMediaBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, files, uploaderMemberId }: UploadMediaBatchInput) => {
            const formData = new FormData();
            files.forEach((file) => formData.append('files', file));
            if (uploaderMemberId) formData.append('uploaderMemberId', uploaderMemberId);
            return api.postForm<MediaBatchUploadResponseDto>(endpoints.events.mediaBatch(eventId), formData);
        },
        onSuccess: (result, { eventId }) => {
            if (result.created.length > 0) {
                queryClient.invalidateQueries({ queryKey: mediaKeys.list(eventId) });
            }
        },
    });
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
