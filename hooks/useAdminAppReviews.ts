'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidatePublicConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { AdminAppReviewDto, AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';
import { adminAppReviewsPath } from '@/lib/reviews';

export const adminAppReviewKeys = {
    all: ['admin', 'app-reviews'] as const,
    list: (page: number, status: AppReviewStatus | null) => ['admin', 'app-reviews', 'list', page, status] as const,
};

export function useAdminAppReviews(page: number, status: AppReviewStatus | null) {
    return useQuery({
        queryKey: adminAppReviewKeys.list(page, status),
        queryFn: () => api.get<Page<AdminAppReviewDto>>(adminAppReviewsPath(page, status)),
        placeholderData: (previous) => previous,
    });
}

// Featuring changes GET /api/config, so the landing page copy is dropped too.
export function usePatchAppReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: AdminAppReviewPatchDto }) =>
            api.patch<AdminAppReviewDto>(endpoints.admin.appReviews.byId(id), patch),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminAppReviewKeys.all });
            invalidatePublicConfig(queryClient);
        },
    });
}
