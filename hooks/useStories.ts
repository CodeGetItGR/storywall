import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import type { StoryBatchCreateResponseDto, StoryRequestDto, StoryResponseDto, StoryViewResponseDto } from '@/lib/api/types';

export const storyKeys = {
    list: (eventId: string) => ['events', eventId, 'stories'] as const,
    detail: (id: string) => ['stories', id] as const,
    views: (storyId: string) => ['stories', storyId, 'views'] as const,
};

// GET /api/events/{eventId}/stories — event member. `expiresAt` is stored
// but there's no confirmed server-side auto-purge — filter `expiresAt < now`
// client-side until confirmed otherwise.
export function useEventStories(eventId: string | null) {
    return useQuery({
        queryKey: storyKeys.list(eventId ?? ''),
        queryFn: async () => {
            const res = await api.get<StoryResponseDto[]>(endpoints.events.stories(eventId!));
            return normalizeList(res).items;
        },
        enabled: Boolean(eventId),
    });
}

// GET /api/stories/{id} — event member.
export function useStory(id: string | null) {
    return useQuery({
        queryKey: storyKeys.detail(id ?? ''),
        queryFn: () => api.get<StoryResponseDto>(endpoints.stories.byId(id!)),
        enabled: Boolean(id),
    });
}

// POST /api/stories — event member. `mediaId` must reference an
// already-uploaded Media (upload via useUploadMedia first).
export function useCreateStory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: StoryRequestDto) => api.post<StoryResponseDto>(endpoints.stories.create, input),
        onSuccess: (story) => {
            queryClient.invalidateQueries({ queryKey: storyKeys.list(story.eventId) });
        },
    });
}

// POST /api/stories/batch — the body is a bare array. Batch-level validation
// is atomic; unresolved media ids are returned as isolated item failures.
export function useCreateStoriesBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: StoryRequestDto[]) => api.post<StoryBatchCreateResponseDto>(endpoints.stories.batch, input),
        onSuccess: (result, input) => {
            const eventId = result.created[0]?.eventId ?? input[0]?.eventId;
            if (eventId) queryClient.invalidateQueries({ queryKey: storyKeys.list(eventId) });
        },
    });
}

// DELETE /api/stories/{id} — author or HOST.
export function useDeleteStory(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.stories.byId(id)),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: storyKeys.list(eventId) });
            queryClient.removeQueries({ queryKey: storyKeys.detail(id) });
        },
    });
}

// POST /api/stories/{id}/views — event member. Idempotent: safe to call on
// every open, not just the first — the server resolves the caller's member
// from the JWT and returns the same view record on repeat calls.
//
// This hook doesn't know which eventId the story belongs to, so it can't
// build storyKeys.list(eventId) directly — instead it patches every cached
// event-stories list that happens to contain this story id.
export function useMarkStoryViewed() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (storyId: string) => api.post<StoryViewResponseDto>(endpoints.stories.views(storyId)),
        onSuccess: (_data, storyId) => {
            queryClient.setQueryData<StoryResponseDto>(storyKeys.detail(storyId), (old) => (old ? { ...old, viewedByCurrentUser: true } : old));
            queryClient.setQueriesData<StoryResponseDto[]>(
                {
                    queryKey: ['events'],
                    exact: false,
                    predicate: (query) => query.queryKey[2] === 'stories',
                },
                (old) => old?.map((story) => (story.id === storyId ? { ...story, viewedByCurrentUser: true } : story))
            );
        },
    });
}

// GET /api/stories/{id}/views — story author or HOST only. Anyone else gets
// a 403; treat that as "no affordance" rather than surfacing an error.
export function useStoryViews(storyId: string | null) {
    return useQuery({
        queryKey: storyKeys.views(storyId ?? ''),
        queryFn: async () => {
            try {
                const res = await api.get<StoryViewResponseDto[]>(endpoints.stories.views(storyId!));
                return normalizeList(res).items;
            } catch (err) {
                if (err instanceof ApiError && err.status === 403) return [];
                throw err;
            }
        },
        enabled: Boolean(storyId),
    });
}
