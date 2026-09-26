import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';

// Bare /feed only redirects to the active event's feed, so the wait looks like that feed loading.
export default function Loading() {
    return <FeedPageSkeleton />;
}
