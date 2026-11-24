'use client';

import { FeedPostRenderer } from '@/components/feed/FeedPostRenderer';
import { PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import { useFeedItems } from '@/hooks/useFeedItems';
import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';

interface FeedPostListProps {
    posts: PostResponseDto[];
    partnerBranding: PartnerBrandingDto | null;
    eventId: string;
}

// The feed's posts, with the partner cards between them.
export function FeedPostList({ posts, partnerBranding, eventId }: FeedPostListProps) {
    const feedItems = useFeedItems(posts, partnerBranding);

    return feedItems.map((item) =>
        item.kind === 'post' ? (
            <FeedPostRenderer
                key={item.post.id}
                post={item.post}
                isLcpCandidate={item.index === 0}
                startsRun={item.startsRun}
                endsRun={item.endsRun}
            />
        ) : (
            /* Partner card */
            partnerBranding && <PartnerFeedCard key={item.key} branding={partnerBranding} eventId={eventId} />
        ),
    );
}
