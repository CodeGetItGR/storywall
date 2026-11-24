'use client';

import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import type { PartnerBrandingDto } from '@/lib/api/types';
import type { FeedItem } from '@/lib/feed/partnerBranding';

interface FeedPostListProps {
    items: FeedItem[];
    partnerBranding: PartnerBrandingDto | null;
    eventId: string;
    // The last card is a post and nothing comes after it.
    endsWithPost: boolean;
}

// The feed's posts, with the partner cards between them.
export function FeedPostList({ items, partnerBranding, eventId, endsWithPost }: FeedPostListProps) {
    return (
        // A plain block, so the space around two cards in a row counts once.
        <div>
            {items.map((item, position) =>
                item.kind === 'post' ? (
                    <FeedPostRenderer key={item.post.id} post={item.post} isLcpCandidate={item.index === 0} isFirst={item.index === 0} endsPage={endsWithPost && position === items.length - 1} />
                ) : (
                    /* Partner card */
                    partnerBranding && <PartnerFeedCard key={item.key} branding={partnerBranding} eventId={eventId} />
                ),
            )}
        </div>
    );
}
