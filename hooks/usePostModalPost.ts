'use client';

import { useQueryClient } from '@tanstack/react-query';

import { commentKeys } from '@/hooks/useComments';
import { usePost } from '@/hooks/usePosts';
import { ApiError } from '@/lib/api/client';
import { isModuleNotAvailableError } from '@/lib/api/errors';

// The post behind the post modal, with every state the modal shows: loading, not found, or
// failed to load. A failure that isn't "not found" (offline, server error) used to render nothing.
export function usePostModalPost(postId: string | null) {
    const queryClient = useQueryClient();
    const { data: post, error, isPending, isFetching, refetch } = usePost(postId);

    const isLoading = !post && (isPending || isFetching);
    const isGone = (error instanceof ApiError && error.status === 404) || isModuleNotAvailableError(error);
    const isNotFound = !post && !isLoading && isGone;
    const isLoadFailed = !post && !isLoading && Boolean(error) && !isGone;

    // The comments failed alongside the post, so they load again with it.
    function retry() {
        void refetch();
        if (postId) void queryClient.invalidateQueries({ queryKey: commentKeys.list(postId) });
    }

    return { post, isLoading, isNotFound, isLoadFailed, retry };
}
