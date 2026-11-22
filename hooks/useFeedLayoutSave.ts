'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeedLayoutSaveRequestDto, FeedLayoutSaveResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';

// Saves the feed layout. The GET answer carries the theme's design and image URLs, so the layout is
// read again rather than patched; the save settles once it has been.
export function useFeedLayoutSave(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: FeedLayoutSaveRequestDto) => api.put<FeedLayoutSaveResponseDto>(endpoints.events.feedLayout(eventId), request),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(eventId) }),
    });
}
