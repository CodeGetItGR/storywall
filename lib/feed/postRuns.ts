import type { FeedItem } from '@/lib/feed/partnerBranding';
import { isPlaylistDigestPost } from '@/lib/feed/playlistDigest';

// The ends of a run: posts drawn one right after the other, with no other card between them.
export interface PostRunEnds {
    startsRun: boolean;
    endsRun: boolean;
}

export type FeedRunItem = (Extract<FeedItem, { kind: 'post' }> & PostRunEnds) | Extract<FeedItem, { kind: 'partner' }>;

// A playlist digest is a post in the list, but the feed draws it as a card of its own.
function isPostInRun(item: FeedItem | undefined): boolean {
    return item?.kind === 'post' && !isPlaylistDigestPost(item.post);
}

/** Marks the first and last post of each run, from the items as the feed draws them. */
export function withPostRuns(items: FeedItem[]): FeedRunItem[] {
    return items.map((item, index) => {
        if (item.kind !== 'post') return item;
        const inRun = isPostInRun(item);
        return {
            ...item,
            startsRun: inRun && !isPostInRun(items[index - 1]),
            endsRun: inRun && !isPostInRun(items[index + 1]),
        };
    });
}
