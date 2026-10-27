'use client';

import { useCallback, useState } from 'react';

import { useAdminAppReviews, usePatchAppReview } from '@/hooks/useAdminAppReviews';
import type { AdminAppReviewDto, AdminAppReviewPatchDto, AppReviewStatus } from '@/lib/api/types';

export function useAppReviewsPanel() {
    const [page, setPage] = useState(0);
    const [status, setStatusFilter] = useState<AppReviewStatus | null>(null);
    // The opened review, kept so the drawer survives its row leaving a filtered list.
    const [snapshot, setSnapshot] = useState<AdminAppReviewDto | null>(null);
    const reviewsQuery = useAdminAppReviews(page, status);
    const patchMutation = usePatchAppReview();
    const { mutate: patchReview, reset: resetPatch } = patchMutation;

    // The list row is fresher than the snapshot, so it wins when present.
    const selected = snapshot ? (reviewsQuery.data?.content.find((review) => review.id === snapshot.id) ?? snapshot) : null;

    const setStatus = useCallback((next: AppReviewStatus | null) => {
        setStatusFilter(next);
        setPage(0);
    }, []);
    const rows = reviewsQuery.data?.content;
    const openReview = useCallback(
        (id: string) => {
            const review = rows?.find((row) => row.id === id);
            if (!review) return;
            resetPatch();
            setSnapshot(review);
        },
        [resetPatch, rows],
    );
    const closeReview = useCallback(() => {
        resetPatch();
        setSnapshot(null);
    }, [resetPatch]);
    const patchSelected = useCallback(
        (patch: AdminAppReviewPatchDto) => {
            if (!snapshot) return;
            patchReview({ id: snapshot.id, patch }, { onSuccess: (updated) => setSnapshot(updated) });
        },
        [patchReview, snapshot],
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
