'use client';

import { useMemo } from 'react';

import { useEventMedia } from '@/hooks/useMedia';
import { sneakPeekCandidates } from '@/lib/sneakPeek';
import { VENDOR_HERO_PHOTOS_MAX } from '@/lib/vendors';
import { useActiveMember } from '@/providers/EventProvider';

// The vendor's own ready Pro photos for the page header. The same query as the Pro album section: one cache,
// prefetched with the page. Videos without a thumbnail are left out, so every tile has a picture.
export function useVendorHeroPhotos(eventId: string, hasProAlbum: boolean) {
    const activeMember = useActiveMember();
    const pro = useEventMedia(hasProAlbum ? eventId : null, 'PRO');

    return useMemo(
        () =>
            sneakPeekCandidates(pro.data?.pages.flatMap((page) => page.content) ?? [], activeMember?.id)
                .filter((item) => item.mediaType === 'IMAGE' || item.thumbnailUrl)
                .slice(0, VENDOR_HERO_PHOTOS_MAX),
        [activeMember?.id, pro.data?.pages],
    );
}
