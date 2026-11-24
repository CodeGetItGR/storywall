import type { MediaResolver } from '@/lib/invitation/render';

export type PinnedPhoto = { id: string; image: { source: 'media'; mediaId: string } };
export type ShownPinnedPhoto = { id: string; url: string };

// The photos Pinned photos draws, in order. One whose URL isn't known (its upload went) is left out.
export function shownPinnedPhotos(photos: readonly PinnedPhoto[], media: MediaResolver): ShownPinnedPhoto[] {
    return photos.flatMap((photo) => {
        const url = media(photo.image.mediaId);
        return url ? [{ id: photo.id, url }] : [];
    });
}
