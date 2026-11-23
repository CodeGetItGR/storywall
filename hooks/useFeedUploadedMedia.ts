'use client';

import { useCallback, useMemo, useState } from 'react';

import type { UploadedImage } from '@/lib/invitation/editorUploads';
import type { MediaResolver } from '@/lib/invitation/render';

// Edit mode's photos: what the saved layout signed, plus what the host uploaded since it opened (their URLs come from
// the upload's answer until the next read signs them).
export function useFeedUploadedMedia(layoutMedia: MediaResolver) {
    const [uploaded, setUploaded] = useState<Record<string, string>>({});
    const remember = useCallback((image: Pick<UploadedImage, 'mediaId' | 'url'>) => {
        setUploaded((current) => ({ ...current, [image.mediaId]: image.url }));
    }, []);
    const media = useMemo<MediaResolver>(() => (mediaId) => uploaded[mediaId] ?? layoutMedia(mediaId), [layoutMedia, uploaded]);
    return { media, remember };
}
