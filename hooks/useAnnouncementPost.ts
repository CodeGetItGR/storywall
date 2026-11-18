'use client';

import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreatePost } from '@/hooks/usePosts';

// Posts one message as an unpinned ANNOUNCEMENT post (text only, posts have no title).
// The server refuses anyone but hosts and planners (4008) and a planner past the access window (4033).
export function useAnnouncementPost() {
    const createPost = useCreatePost();
    const toErrorMessage = useApiErrorMessage();
    const [error, setError] = useState<string | null>(null);

    // True when the announcement was posted.
    const post = useCallback(
        async (eventId: string, message: string): Promise<boolean> => {
            const content = message.trim();
            if (!content) return false;
            setError(null);
            try {
                await createPost.mutateAsync({ eventId, type: 'ANNOUNCEMENT', content, isPinned: false });
                return true;
            } catch (postError) {
                setError(toErrorMessage(postError));
                return false;
            }
        },
        [createPost, toErrorMessage],
    );

    const reset = useCallback(() => setError(null), []);

    return { post, isPosting: createPost.isPending, error, reset };
}
