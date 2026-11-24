'use client';

import { useMemo } from 'react';

import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';
import { withPartnerCards } from '@/lib/feed/partnerBranding';
import { withPostRuns } from '@/lib/feed/postRuns';

/** The feed's posts with the event's partner cards placed between them, and the ends of each run of posts marked. */
export function useFeedItems(posts: PostResponseDto[], partnerBranding: PartnerBrandingDto | null) {
    const placement = partnerBranding?.placement ?? null;
    return useMemo(() => withPostRuns(withPartnerCards(posts, placement)), [posts, placement]);
}
