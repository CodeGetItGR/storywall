'use client';

import { useCallback, useState } from 'react';

import { useAdminAppReviews, usePatchAppReview } from '@/hooks/useAdminAppReviews';
import type { AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';

export function useAppReviewsPanel() {
    const [page, setPage] = useState(0);
    const [status, setStatusFilter] = useState<AppReviewStatus | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const reviewsQuery = useAdminAppReviews(page, status);
    const patchMutation = usePatchAppReview();
    const { mutate: patchReview } = patchMutation;

    // The drawer shows the row from the current page, so it updates when the list refetches.
    const selected = reviewsQuery.data?.content.find((review) => review.id === selectedId) ?? null;

    const setStatus = useCallback((next: AppReviewStatus | null) => {
        setStatusFilter(next);
        setPage(0);
    }, []);
    const openReview = useCallback((id: string) => setSelectedId(id), []);
    const closeReview = useCallback(() => setSelectedId(null), []);
    const patchSelected = useCallback(
        (patch: AdminAppReviewPatchDto) => {
            if (selectedId) patchReview({ id: selectedId, patch });
        },
        [patchReview, selectedId],
    );

    return {
        page,
        setPage,
        status,
        setStatus,
        reviewsQuery,
        selected,
        openReview,
        closeReview,
        patchSelected,
        isSaving: patchMutation.isPending,
        patchError: patchMutation.error,
    };
}
