'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { MediaCollection } from '@/lib/api/types';
import { replacePageUrl } from '@/lib/overlayHistory';

// The gallery tab lives in ?album=pro. Written with a plain history replace (like
// useRsvpSubTab) so a tab click never re-runs the server page.
export function useGalleryAlbum() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const album: MediaCollection = searchParams.get('album') === 'pro' ? 'PRO' : 'GUEST';

    const setAlbum = useCallback(
        (next: MediaCollection) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === 'PRO') params.set('album', 'pro');
            else params.delete('album');
            const query = params.toString();
            replacePageUrl(query ? `${pathname}?${query}` : pathname);
        },
        [pathname, searchParams],
    );

    return { album, setAlbum };
}
