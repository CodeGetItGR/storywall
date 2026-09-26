import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';
import { PostRedirectErrorState } from '@/components/post/PostRedirectErrorState';

export function PostRedirectState({
    error,
    errorDescription,
    errorTitle,
    errorActionLabel,
}: {
    error: unknown;
    errorDescription: string;
    errorTitle: string;
    errorActionLabel: string;
}) {
    if (error) {
        return <PostRedirectErrorState title={errorTitle} description={errorDescription} actionLabel={errorActionLabel} />;
    }

    // The post opens on its event's feed, so the wait looks like that feed loading.
    return <FeedPageSkeleton />;
}
