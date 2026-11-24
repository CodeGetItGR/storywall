'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import type { ViewerMedia } from '@/components/feed/post/PostMediaCarousel';
import { type PinnedPhoto, shownPinnedPhotos } from '@/lib/feedPinned';
import type { MediaResolver } from '@/lib/invitation/render';

// Pinned photos full screen, in the viewer post photos use: which photo is open (null when none is) and the photos as
// the viewer takes them.
export function useFeedPinnedViewer(photos: readonly PinnedPhoto[], media: MediaResolver) {
    const t = useTranslations('FeedSections.pinned');
    const [index, setIndex] = useState<number | null>(null);

    const items = useMemo<ViewerMedia[]>(() => {
        const shown = shownPinnedPhotos(photos, media);
        return shown.map((photo, position) => ({
            id: photo.id,
            mediaUrl: photo.url,
            mediaType: 'IMAGE',
            status: 'READY',
            metadata: {},
            alt: t('photoAlt', { number: position + 1, count: shown.length }),
        }));
    }, [media, photos, t]);

    const close = useCallback(() => setIndex(null), []);

    return { items, index: index !== null && index < items.length ? index : null, open: setIndex, close };
}
