'use client';

import { useCallback, useMemo, useState } from 'react';

import type { MediaResolver } from '@/lib/invitation/render';

// Images uploaded while the editor is open, shown at once from the address the
// upload answered with. The draft's own images come from `media`.
export function useUploadedMedia(media: MediaResolver) {
    const [uploaded, setUploaded] = useState<Record<string, string>>({});

    const addUploaded = useCallback((mediaId: string, url: string) => setUploaded((current) => ({ ...current, [mediaId]: url })), []);
    const resolver = useMemo<MediaResolver>(() => (mediaId) => uploaded[mediaId] ?? media(mediaId), [media, uploaded]);

    return { media: resolver, addUploaded };
}
