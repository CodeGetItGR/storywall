'use client';

import { useMemo } from 'react';

import type { PartnerBrandingDto, PostResponseDto } from '@/lib/api/types';
import { withPartnerCards } from '@/lib/feed/partnerBranding';

/** The feed's posts with the event's partner cards placed between them. */
export function useFeedItems(posts: PostResponseDto[], partnerBranding: PartnerBrandingDto | null) {
    const placement = partnerBranding?.placement ?? null;
    return useMemo(() => withPartnerCards(posts, placement), [posts, placement]);
}
