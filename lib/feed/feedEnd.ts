import { isPlaylistDigestPost } from '@/components/feed/post/postUtils';
import type { FeedItem } from '@/lib/feed/partnerBranding';

/** Whether the page ends with a post: every post is loaded, and the last card drawn is one (a playlist digest isn't). */
export function feedEndsWithPost(items: FeedItem[], hasNextPage: boolean): boolean {
    const last = items[items.length - 1];
    return !hasNextPage && last?.kind === 'post' && !isPlaylistDigestPost(last.post);
}
