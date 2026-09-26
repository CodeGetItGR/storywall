import { FeedPageSkeleton } from '@/components/feed/FeedPageSkeleton';

// Shown the moment a link to the feed is clicked, while the server renders it.
export default function Loading() {
    return <FeedPageSkeleton />;
}
