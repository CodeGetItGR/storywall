'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AppReviewPromptDto, AppReviewRequestDto } from '@/lib/api/types';

export const reviewKeys = {
    prompt: ['me', 'review-prompt'] as const,
};

// GET /api/me/review-prompt: 204 parses to null. Not prefetched on the server:
// it is an optional overlay, and asking once per session is enough.
export function useReviewPrompt(enabled: boolean) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: reviewKeys.prompt,
        queryFn: () => api.get<AppReviewPromptDto | null>(endpoints.me.reviewPrompt),
        enabled,
        staleTime: Infinity,
        retry: false,
    });

    const forget = useCallback(() => queryClient.setQueryData(reviewKeys.prompt, null), [queryClient]);

    const submit = useMutation({
        retry: false,
        mutationFn: (dto: AppReviewRequestDto) => api.post<null>(endpoints.me.reviews, dto),
    });

    const dismiss = useMutation({
        retry: false,
        mutationFn: (eventId: string) => api.post<null>(endpoints.me.reviewsDismiss, { eventId }),
        // Even a failed dismiss hides the prompt for this session.
        onSettled: forget,
    });

    return { prompt: query.data ?? null, submit, dismiss, forget };
}
